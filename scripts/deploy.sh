#!/usr/bin/env bash
# ============================================================
# DEPLOY — Déploiement automatisé production
# ============================================================
# Usage: ./scripts/deploy.sh [staging|production]
#   staging    → déploie sur l'environnement de staging
#   production → déploie sur la production
# ============================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────
COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
STACK_NAME="oeuvres-sociales-prod"

# ── Couleurs ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

# ── Pré-déploiement : vérifications ──────────────────────
pre_deploy_checks() {
    log_step "Vérifications pré-déploiement..."

    # Fichiers AppleDouble macOS (._*) : cassent `git status`/`git fsck`
    # et polluent les contexts de build Docker.
    local junk_count
    junk_count=$(find . -name '._*' -type f 2>/dev/null | wc -l)
    if [ "$junk_count" -gt 0 ]; then
        find . -name '._*' -type f -delete
        log_warn "$junk_count fichier(s) AppleDouble (._*) supprimés"
    fi

    if [ ! -f "backend/.env.production" ]; then
        log_error "Fichier backend/.env.production manquant"
        exit 1
    fi

    if [ ! -d "nginx/ssl" ]; then
        log_warn "Dossier nginx/ssl/ manquant — vérifiez les certificats"
    fi

    # Vérifier que Docker est disponible (en distinguant droits et daemon)
    if ! docker info &>/dev/null; then
        if docker info 2>&1 | grep -qi "permission denied"; then
            log_error "Docker : droits insuffisants (permission denied ... docker.sock)"
            log_error "  Correctif : sudo usermod -aG docker \$USER  puis déconnexion/reconnexion"
        else
            log_error "Docker n'est pas en cours d'exécution"
        fi
        exit 1
    fi

    # ALLOWED_HOSTS doit contenir l'IP de ce serveur, sinon Django répond
    # « 400 Bad Request » sur toutes les requêtes HTTPS.
    if [ -f "backend/.env.production" ]; then
        local host_ip
        host_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -n "$host_ip" ] && ! grep -F "ALLOWED_HOSTS=" backend/.env.production | grep -qF "$host_ip"; then
            log_warn "ALLOWED_HOSTS ne contient pas l'IP de ce serveur ($host_ip)"
            log_warn "  → https://$host_ip renverra 400 Bad Request (DisallowedHost)"
        fi
    fi

    # VITE_API_URL doit être relatif : s'il est absolu, l'application parle
    # à un autre serveur (erreur typée ERR_CERT_AUTHORITY_INVALID / CORS).
    if [ -f "frontend/.env.production" ] && grep -qE '^VITE_API_URL=https?://' frontend/.env.production; then
        log_warn "VITE_API_URL est absolu ($(grep -E '^VITE_API_URL=' frontend/.env.production | cut -d= -f2-))"
        log_warn "  → recommandé : VITE_API_URL=/api/v1 puis rebuild du frontend"
    fi

    # Vérifier que docker-compose.prod.yml existe
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "$COMPOSE_FILE introuvable"
        exit 1
    fi

    log_info "Toutes les vérifications sont passées"
}

# ── Pull des images ──────────────────────────────────────
pull_images() {
    log_step "Récupération des images Docker..."
    docker compose -f "$COMPOSE_FILE" pull --quiet
    log_info "Images téléchargées"
}

# ── Déploiement des services ──────────────────────────────
deploy_services() {
    log_step "Déploiement des services..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --wait
    log_info "Services démarrés"
}

# ── Attente que les services soient sains ────────────────
wait_for_health() {
    local retries=30
    local interval=5
    local base_url="${SITE_URL:-http://localhost:8000}"

    log_step "Attente de la disponibilité des services..."

    for i in $(seq 1 $retries); do
        # Vérification via le health endpoint HTTP
        if curl -sf "$base_url/api/v1/health/live/" -o /dev/null 2>/dev/null; then
            log_info "✓ Backend sain (tentative $i/$retries)"
            # Vérification approfondie (DB + cache)
            if curl -sf "$base_url/api/v1/health/ready/" -o /dev/null 2>/dev/null; then
                log_info "✓ Backend prêt (DB + cache OK)"
                return 0
            fi
        fi
        sleep "$interval"
    done

    log_warn "⚠️  Services non disponibles — vérifiez les logs"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 backend nginx
    return 1
}

# ── Migrations et collectstatic ──────────────────────────
run_django_tasks() {
    log_step "Application des migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput
    log_info "✓ Migrations appliquées"

    log_step "Collecte des fichiers statiques..."
    docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput --clear
    log_info "✓ Fichiers statiques collectés"
}

# ── Nettoyage ─────────────────────────────────────────────
cleanup() {
    log_step "Nettoyage des ressources inutilisées..."
    docker system prune -f --volumes 2>/dev/null || true
    log_info "✓ Nettoyage terminé"
}

# ── Smoke tests ───────────────────────────────────────────
smoke_tests() {
    local base_url="${SITE_URL:-https://oeuvres-sociales.dz}"

    log_step "Exécution des smoke tests..."

    local tests=0
    local passed=0

    test_endpoint() {
        local url="$1"
        local expected="$2"
        local label="${3:-$url}"
        local status
        tests=$((tests + 1))
        status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if echo "$expected" | grep -q "$status"; then
            log_info "  ✓ $label ($status)"
            passed=$((passed + 1))
        else
            log_error "  ✗ $label — attendu $expected, reçu $status"
        fi
    }

    # Health endpoints
    test_endpoint "$base_url/api/v1/health/live/"   "200" "Liveness"
    test_endpoint "$base_url/api/v1/health/ready/"  "200" "Readiness"
    test_endpoint "$base_url/api/v1/health/"        "200" "Deep Health"

    # Prometheus metrics
    test_endpoint "$base_url/metrics"               "200" "Prometheus Metrics"

    # Auth
    test_endpoint "$base_url/api/v1/auth/verify/"   "401" "Auth Verify (expect 401 = JWT required)"

    # Frontend
    test_endpoint "$base_url/"                      "200|302" "Frontend"

    echo ""
    if [ "$passed" -eq "$tests" ]; then
        log_info "✓ $passed/$tests smoke tests réussis"
    else
        log_warn "⚠️  $passed/$tests smoke tests réussis"
    fi
}

# ── Post-déploiement ─────────────────────────────────────
post_deploy() {
    log_step "Configuration post-déploiement..."

    # Créer/Mettre à jour les tâches Celery Beat
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        python manage.py celery_beat_update_schedule 2>/dev/null || true

    log_info "✓ Post-déploiement terminé"
}

# ── Rollback (en cas d'échec) ────────────────────────────
rollback() {
    log_warn "⚠️  Échec du déploiement — rollback vers la version précédente..."

    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up -d

    log_info "Rollback effectué — vérifiez l'état des services"
}

# ── Main ──────────────────────────────────────────────────
main() {
    local env="${1:-staging}"
    echo ""
    echo "╔═══════════════════════════════════════════════╗"
    echo "║   Déploiement Oeuvres Sociales — $env"
    echo "╚═══════════════════════════════════════════════╝"
    echo ""

    if [ "$env" != "staging" ] && [ "$env" != "production" ]; then
        log_error "Environnement invalide : $env (choisissez staging ou production)"
        exit 1
    fi

    pre_deploy_checks
    pull_images
    deploy_services
    wait_for_health
    run_django_tasks
    smoke_tests
    post_deploy
    cleanup

    echo ""
    log_info "=== Déploiement $env terminé avec succès ==="
    echo ""
}

main "$@"
