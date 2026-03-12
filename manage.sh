#!/bin/bash
# =============================================================
# TDB - Script de gestion rapide du VPS
# Usage: bash manage.sh [commande]
# =============================================================

SERVICE="tdb"
APP_DIR="/opt/tdb"

case "$1" in
    start)
        echo "Démarrage du bot TDB..."
        sudo systemctl start $SERVICE
        sleep 2
        sudo systemctl status $SERVICE --no-pager
        ;;
    stop)
        echo "Arrêt du bot TDB..."
        sudo systemctl stop $SERVICE
        ;;
    restart)
        echo "Redémarrage du bot TDB..."
        sudo systemctl restart $SERVICE
        sleep 2
        sudo systemctl status $SERVICE --no-pager
        ;;
    status)
        sudo systemctl status $SERVICE --no-pager -l
        ;;
    logs)
        sudo journalctl -u $SERVICE -f --no-pager
        ;;
    logs-tail)
        sudo journalctl -u $SERVICE -n 100 --no-pager
        ;;
    update)
        echo "Mise à jour du projet depuis Git..."
        cd $APP_DIR
        sudo -u tdb git pull origin master
        sudo -u tdb $APP_DIR/venv/bin/pip install -r requirements.txt -q
        sudo systemctl restart $SERVICE
        sleep 2
        sudo systemctl status $SERVICE --no-pager
        echo "Mise à jour terminée!"
        ;;
    resources)
        echo "=== Utilisation des ressources ==="
        echo ""
        echo "-- CPU & RAM --"
        top -bn1 | grep -E "(Cpu|Mem|Swap)" | head -3
        echo ""
        echo "-- Disque --"
        df -h /
        echo ""
        echo "-- Processus TDB --"
        ps aux | grep python | grep -v grep
        echo ""
        echo "-- Mémoire du service --"
        sudo systemctl status $SERVICE --no-pager | grep Memory || true
        ;;
    backup-db)
        BACKUP_FILE="/tmp/tdb_backup_$(date +%Y%m%d_%H%M%S).db"
        cp $APP_DIR/database/trading_bot.db "$BACKUP_FILE"
        echo "Base de données sauvegardée: $BACKUP_FILE"
        ;;
    *)
        echo "TDB Bot - Gestionnaire VPS"
        echo ""
        echo "Usage: bash manage.sh [commande]"
        echo ""
        echo "Commandes disponibles:"
        echo "  start        Démarrer le bot"
        echo "  stop         Arrêter le bot"
        echo "  restart      Redémarrer le bot"
        echo "  status       Voir le statut du service"
        echo "  logs         Voir les logs en temps réel"
        echo "  logs-tail    Voir les 100 dernières lignes de logs"
        echo "  update       Mettre à jour depuis Git et redémarrer"
        echo "  resources    Voir l'utilisation CPU/RAM/Disque"
        echo "  backup-db    Sauvegarder la base de données"
        ;;
esac
