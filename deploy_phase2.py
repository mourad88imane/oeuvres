"""Creates InvoiceCoverageRequestLine table and appends model to models.py"""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.db import connection, transaction

TABLE = "invoicing_invoicecoveragerequestline"
with connection.cursor() as c:
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            id UUID NOT NULL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            amount NUMERIC(12,2) NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            invoice_id UUID NOT NULL REFERENCES invoicing_providerinvoice(id) DEFERRABLE INITIALLY DEFERRED,
            coverage_request_id UUID NOT NULL
                REFERENCES medical_coverage_medicalcoveragerequest(id) DEFERRABLE INITIALLY DEFERRED,
            UNIQUE(invoice_id, coverage_request_id)
        );
    """)
    c.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('invoicing', '0004_invoice_coverage_request_line', NOW())
        ON CONFLICT DO NOTHING;
    """)
    transaction.commit()
    print(f"Table {TABLE}: OK")

# Append model class to models.py if not already there
models_path = "/app/apps/invoicing/models.py"
with open(models_path, "r") as f:
    content = f.read()

if "class InvoiceCoverageRequestLine" not in content:
    append = """
class InvoiceCoverageRequestLine(BaseModel):
    invoice = models.ForeignKey(
        ProviderInvoice, on_delete=models.CASCADE,
        related_name="coverage_lines", verbose_name=_("Facture"),
    )
    coverage_request = models.ForeignKey(
        "medical_coverage.MedicalCoverageRequest", on_delete=models.PROTECT,
        related_name="invoice_lines", verbose_name=_("Demande de prise en charge"),
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))

    class Meta:
        verbose_name = _("Ligne de facture (demande)")
        verbose_name_plural = _("Lignes de facture (demandes)")
        unique_together = [["invoice", "coverage_request"]]

    def __str__(self):
        return f"{self.invoice.reference} - {self.coverage_request.request_number}"
"""
    with open(models_path, "a") as f:
        f.write(append)
    print(f"Appended InvoiceCoverageRequestLine to {models_path}")
else:
    print(f"InvoiceCoverageRequestLine already in {models_path}")
