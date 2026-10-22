import logging
import time

logger = logging.getLogger("apps.monitoring")


class APIMonitoringMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        start = time.time()
        response = self.get_response(request)
        duration_ms = int((time.time() - start) * 1000)

        self._log_request(request, response, duration_ms)
        self._update_endpoint_status(request, response, duration_ms)

        return response

    def _log_request(self, request, response, duration_ms):
        try:
            from .models import APIRequestLog

            log = APIRequestLog(
                method=request.method,
                endpoint=request.path,
                path=request.path,
                query_params=dict(request.GET.items()),
                status_code=response.status_code,
                duration_ms=duration_ms,
                response_size=len(response.content) if hasattr(response, "content") else None,
                ip_address=self._get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                request_id=getattr(request, "request_id", ""),
                is_error=response.status_code >= 400,
            )
            if hasattr(request, "user") and request.user.is_authenticated:
                log.user = request.user

            if response.status_code >= 500:
                try:
                    log.error_message = (
                        response.data.get("detail", "")[:1000] if hasattr(response, "data") else ""
                    )
                except Exception:
                    pass

            log.save()

            if response.status_code >= 500:
                from .models import SecurityEvent

                SecurityEvent.objects.create(
                    event_type=SecurityEvent.EventType.API_ABUSE,
                    severity=SecurityEvent.Severity.HIGH,
                    user=request.user if request.user.is_authenticated else None,
                    user_email=request.user.email if request.user.is_authenticated else "",
                    ip_address=log.ip_address,
                    endpoint=request.path,
                    details={"status_code": response.status_code, "method": request.method},
                    request_id=log.request_id,
                )

        except Exception as e:
            logger.error("API monitoring logging failed: %s", e, exc_info=True)

    def _update_endpoint_status(self, request, response, duration_ms):
        try:
            from django.db.models import Avg, Max, Min
            from django.utils import timezone

            from .models import APIEndpointStatus

            # update_or_create (et non get_or_create) : sous requêtes concurrentes,
            # get_or_create déclenche un IntegrityError « duplicate key » sur la
            # contrainte d'unicité (endpoint, method) — bug P7 corrigé le 22/10.
            status, _ = APIEndpointStatus.objects.update_or_create(
                endpoint=request.path,
                method=request.method,
            )
            status.total_calls += 1
            if response.status_code >= 400:
                status.error_count += 1
            status.last_called = timezone.now()
            status.last_status = response.status_code

            # Rolling averages from recent 100 calls
            from .models import APIRequestLog

            recent = APIRequestLog.objects.filter(
                method=request.method,
                endpoint=request.path,
            ).order_by("-timestamp")[:100]
            agg = recent.aggregate(
                avg=Avg("duration_ms"),
                mx=Max("duration_ms"),
                mn=Min("duration_ms"),
            )
            status.avg_duration_ms = agg["avg"] or duration_ms
            status.max_duration_ms = agg["mx"] or duration_ms
            status.min_duration_ms = agg["mn"] or duration_ms

            # Degradation detection
            error_rate = status.error_count / max(status.total_calls, 1)
            if error_rate > 0.1 and not status.is_degraded:
                status.is_degraded = True
                status.degraded_since = timezone.now()
            elif error_rate <= 0.05 and status.is_degraded:
                status.is_degraded = False
                status.degraded_since = None

            status.save()

        except Exception as e:
            logger.error("Endpoint status update failed: %s", e, exc_info=True)

    def _get_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")
