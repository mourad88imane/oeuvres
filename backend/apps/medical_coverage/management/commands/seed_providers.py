import re
from django.core.management.base import BaseCommand

PROVIDERS = [
    # Laboratoires d'analyses -> coverage_type: analysis
    {"name": "Laboratoire Central d'Analyses Médicales", "type": "lab", "coverage_types": ["analysis"], "city": "Alger", "phone": "+213 21 63 12 45", "address": "05 Rue Didouche Mourad, Alger Centre"},
    {"name": "Laboratoire EL-BIAR Analyses", "type": "lab", "coverage_types": ["analysis"], "city": "Alger", "phone": "+213 21 91 23 56", "address": "12 Rue Mohamed Belouizdad, El-Biar"},
    {"name": "Laboratoire d'Analyses Médicales Bab El Oued", "type": "lab", "coverage_types": ["analysis"], "city": "Alger", "phone": "+213 21 62 78 90", "address": "08 Boulevard Zighoud Youcef, Bab El Oued"},
    {"name": "Laboratoire Bio-Analyse Oran", "type": "lab", "coverage_types": ["analysis"], "city": "Oran", "phone": "+213 41 39 12 56", "address": "15 Rue Larbi Ben M'hidi, Oran Centre"},
    {"name": "Laboratoire Constantine Analyses", "type": "lab", "coverage_types": ["analysis"], "city": "Constantine", "phone": "+213 31 62 34 78", "address": "22 Avenue Roumane, Constantine"},
    {"name": "Laboratoire d'Analyses Médicales Annaba", "type": "lab", "coverage_types": ["analysis"], "city": "Annaba", "phone": "+213 38 86 12 45", "address": "07 Rue Didouche Mourad, Annaba"},
    {"name": "Laboratoire Sétif Bio", "type": "lab", "coverage_types": ["analysis"], "city": "Sétif", "phone": "+213 36 92 34 56", "address": "18 Boulevard de l'Indépendance, Sétif"},
    {"name": "Laboratoire Blida Medical Analysis", "type": "lab", "coverage_types": ["analysis"], "city": "Blida", "phone": "+213 25 43 12 78", "address": "03 Rue Ben Bouali, Blida"},
    # Centres d'imagerie -> coverage_type: imaging
    {"name": "Centre d'Imagerie Médicale Alger Centre", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Alger", "phone": "+213 21 74 56 12", "address": "45 Rue Hassiba Ben Bouali, Alger Centre"},
    {"name": "IRM & Scanner Hussein Dey", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Alger", "phone": "+213 21 49 23 78", "address": "18 Boulevard du 1er Novembre, Hussein Dey"},
    {"name": "Centre de Radiologie EL-ACHOUR", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Alger", "phone": "+213 21 36 78 90", "address": "09 Rue des Frères Arbouz, Draria"},
    {"name": "Imagerie Médicale Oran", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Oran", "phone": "+213 41 28 45 67", "address": "30 Boulevard de l'ALN, Oran"},
    {"name": "Scanner & IRM Constantine", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Constantine", "phone": "+213 31 74 12 56", "address": "12 Rue Abane Ramdane, Constantine"},
    {"name": "Centre d'Imagerie Médicale Tizi Ouzou", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Tizi Ouzou", "phone": "+213 26 21 34 78", "address": "05 Avenue de l'Indépendance, Tizi Ouzou"},
    {"name": "Radiologie Centrale Blida", "type": "imaging_center", "coverage_types": ["imaging"], "city": "Blida", "phone": "+213 25 41 23 56", "address": "17 Rue de la Liberté, Blida"},
    # Centres médicaux / consultations -> coverage_type: center
    {"name": "Polyclinique des Annassers", "type": "medical_center", "coverage_types": ["center"], "city": "Alger", "phone": "+213 21 52 34 56", "address": "Cite des Annassers, Kouba"},
    {"name": "Centre Médical de Birkhadem", "type": "clinic", "coverage_types": ["center"], "city": "Alger", "phone": "+213 21 44 56 78", "address": "22 Rue Mohamed Khemisti, Birkhadem"},
    {"name": "Clinique Spécialisée Oran", "type": "clinic", "coverage_types": ["center"], "city": "Oran", "phone": "+213 41 39 45 67", "address": "08 Boulevard de la République, Oran"},
    {"name": "Centre Médical Emir Abdelkader", "type": "medical_center", "coverage_types": ["center"], "city": "Constantine", "phone": "+213 31 63 12 34", "address": "14 Rue Belgacem, Constantine"},
    {"name": "Polyclinique des Aurès", "type": "medical_center", "coverage_types": ["center"], "city": "Batna", "phone": "+213 33 86 12 45", "address": "03 Boulevard de la Révolution, Batna"},
    {"name": "Centre Médical Tizi Ouzou", "type": "medical_center", "coverage_types": ["center"], "city": "Tizi Ouzou", "phone": "+213 26 21 45 67", "address": "11 Rue de la Gare, Tizi Ouzou"},
    {"name": "Clinique Ibn Rochd", "type": "clinic", "coverage_types": ["center"], "city": "Annaba", "phone": "+213 38 84 12 56", "address": "19 Boulevard de la Soummam, Annaba"},
    # Centres médicaux avec tous les types de couverture (pour polyvalents)
    {"name": "Centre Hospitalo-Universitaire Mustapha Pacha", "type": "hospital", "coverage_types": ["analysis", "imaging", "center"], "city": "Alger", "phone": "+213 21 23 45 67", "address": "Place du 1er Mai, Alger Centre"},
    {"name": "CHU Oran", "type": "hospital", "coverage_types": ["analysis", "imaging", "center"], "city": "Oran", "phone": "+213 41 58 12 34", "address": "Boulevard Dr Benzerdjeb, Oran"},
    {"name": "CHU Constantine Ben Badis", "type": "hospital", "coverage_types": ["analysis", "imaging", "center"], "city": "Constantine", "phone": "+213 31 46 12 45", "address": "Route de Batna, Constantine"},
    {"name": "Etablissement Hospitalier Spécialisé Aïn Naâdja", "type": "hospital", "coverage_types": ["analysis", "imaging", "center"], "city": "Alger", "phone": "+213 21 56 78 90", "address": "Route de Aïn Naâdja, Djasr Kasentina"},
]

COVERAGE_TO_CATEGORY = {
    "analysis": "medical_analysis_lab",
    "imaging": "medical_imaging_center",
    "center": "medical_center",
}

MEDICAL_TYPE_TO_PARTNER_TYPE = {
    "lab": "lab",
    "imaging_center": "imaging_center",
    "medical_center": "medical_center",
    "clinic": "clinic",
    "hospital": "hospital",
    "specialist": "other",
}


def _make_code(name: str) -> str:
    s = name.upper().replace("'", "")
    s = re.sub(r"[^A-Z0-9\s]", "", s)
    parts = s.split()
    if len(parts) >= 3:
        code = "".join(p[0] for p in parts[:3])
    elif len(parts) == 2:
        code = parts[0][:4] + parts[1][:2]
    else:
        code = parts[0][:6]
    return code


class Command(BaseCommand):
    help = "Seed les prestataires médicaux pour les bons de prise en charge"

    def handle(self, *args, **options):
        from apps.medical_coverage.models import MedicalProvider
        from apps.conventions.models import Partner

        created_count = 0
        for data in PROVIDERS:
            provider, created = MedicalProvider.objects.get_or_create(
                name=data["name"],
                defaults={
                    "type": data["type"],
                    "coverage_types": data["coverage_types"],
                    "address": data.get("address", ""),
                    "phone": data.get("phone", ""),
                    "email": data.get("email", ""),
                    "city": data["city"],
                    "is_active": True,
                },
            )

            if provider.partner_id:
                if created:
                    self.stdout.write(f"  🏥 {data['name']} — {data['city']} (déjà lié au partenaire)")
                continue

            coverage = data["coverage_types"]
            category = None
            if len(coverage) == 1:
                category = COVERAGE_TO_CATEGORY.get(coverage[0], "")
            partner_type = MEDICAL_TYPE_TO_PARTNER_TYPE.get(data["type"], "other")
            code = _make_code(data["name"])

            partner, partner_created = Partner.objects.get_or_create(
                name=data["name"],
                defaults={
                    "code": code,
                    "type": partner_type,
                    "category": category or "",
                    "address": data.get("address", ""),
                    "phone": data.get("phone", ""),
                    "email": data.get("email", ""),
                    "city": data["city"],
                    "is_active": True,
                },
            )
            if not partner_created:
                code = f"{code}-{provider.pk.hex[:6]}"
                partner = Partner.objects.create(
                    code=code,
                    name=data["name"],
                    type=partner_type,
                    category=category or "",
                    address=data.get("address", ""),
                    phone=data.get("phone", ""),
                    email=data.get("email", ""),
                    city=data["city"],
                    is_active=True,
                )

            provider.partner = partner
            provider.save(update_fields=["partner"])

            if created:
                created_count += 1
                self.stdout.write(f"  🏥 {data['name']} — {data['city']} (partenaire lié)")

        self.stdout.write(self.style.SUCCESS(f"✅ {created_count} prestataires créés avec partenaires liés"))
