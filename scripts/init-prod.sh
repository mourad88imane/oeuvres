#!/usr/bin/env bash
# ============================================================
# INIT PROD — Préparation initiale de l'environnement prod
# ============================================================
# Usage: sudo ./scripts/init-prod.sh
# À exécuter sur le serveur nu avant le premier déploiement
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Vérifier qu'on est root ──────────────────────────────
if [ "$EUID" -ne 0 ]; then
    log_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   Initialisation Serveur Production           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── 1. Mise à jour système ──────────────────────────────
log_info "Mise à jour du système..."
apt-get update && apt-get upgrade -y

# ── 2. Dépendances système ──────────────────────────────
log_info "Installation des dépendances..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    ufw \
    htop \
    iotop \
    netdata \
    logrotate \
    fail2ban \
    unattended-upgrades

# ── 3. Docker ────────────────────────────────────────────
log_info "Installation de Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# ── 3b. Groupe docker ────────────────────────────────────
# SANS CETTE ÉTAPE, toute commande docker échoue avec :
#   permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
# (Makefile : make dev / status / logs / migrate … deviennent tous inutilisables)
log_info "Ajout de l'utilisateur courant au groupe docker..."
TARGET_USER="${SUDO_USER:-$(logname 2>/dev/null || true)}"
if [ -n "${TARGET_USER:-}" ] && [ "$TARGET_USER" != "root" ]; then
    usermod -aG docker "$TARGET_USER"
    log_info "Utilisateur '$TARGET_USER' ajouté au groupe docker (reconnexion requise)"
else
    log_warn "Lancez ce script avec sudo pour être ajouté au groupe docker"
fi

# ── 4. Docker Compose ────────────────────────────────────
log_info "Installation de Docker Compose..."
if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
fi

# ── 5. Firewall (UFW) ───────────────────────────────────
log_info "Configuration du firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 6. Swap ──────────────────────────────────────────────
log_info "Configuration du swap..."
if ! swapon --show | grep -q /swapfile; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap 2G créé"
fi

# ── 7. Kernel tuning ────────────────────────────────────
log_info "Optimisation kernel..."
cat >> /etc/sysctl.conf << 'EOF'

# Oeuvres Sociales — Kernel tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.ip_local_port_range = 1024 65535
fs.file-max = 2097152
EOF
sysctl -p

# ── 8. Répertoires ──────────────────────────────────────
log_info "Création des répertoires..."
mkdir -p /opt/oeuvres-sociales
mkdir -p /opt/backups/oeuvres-sociales/{db,files,config}
chmod 700 /opt/backups

# ── 9. Fail2ban ─────────────────────────────────────────
log_info "Configuration Fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF
systemctl restart fail2ban

# ── 10. Unattended upgrades ────────────────────────────
log_info "Configuration des mises à jour automatiques..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# ── Résumé ─────────────────────────────────────────────
echo ""
log_info "=== Initialisation terminée ==="
echo ""
echo "  Prochaine étape :"
echo "  1. Se déconnecter puis se reconnector (le groupe docker n'est actif qu'à la reconnexion)"
echo "  2. Cloner le dépôt : git clone ... /opt/oeuvres-sociales"
echo "  3. Nettoyer les fichiers AppleDouble : find /opt/oeuvres-sociales -name '._*' -type f -delete"
echo "  4. Configurer backend/.env.production (ALLOWED_HOSTS = IP du serveur)"
echo "  5. Configurer frontend/.env.production (VITE_API_URL=/api/v1)"
echo "  6. Copier les certificats SSL dans nginx/ssl/"
echo "  7. Lancer : docker compose -f docker-compose.prod.yml up -d --build"
echo "  8. Migrations + compte admin :"
echo "       docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
echo "       docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo ""

# ── Redémarrage recommandé ─────────────────────────────
log_warn "Un redémarrage est recommandé pour appliquer tous les changements"
read -p "Redémarrer maintenant ? (o/N) : " -r
if [[ $REPLY =~ ^[Oo]$ ]]; then
    reboot
fi
