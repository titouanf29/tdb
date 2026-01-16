#!/usr/bin/env python3
"""
Script de correction automatique du bug welcome_message
Corrige toutes les occurrences de 'welcome_message,' par 'message,' dans tdb.py
"""

import os
import sys
from pathlib import Path

def fix_welcome_message_bug(file_path):
    """Corrige le bug welcome_message dans le fichier spécifié"""

    print(f"🔍 Lecture du fichier: {file_path}")

    # Vérifier que le fichier existe
    if not os.path.exists(file_path):
        print(f"❌ Erreur: Le fichier {file_path} n'existe pas")
        return False

    # Lire le contenu
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Erreur lors de la lecture: {e}")
        return False

    # Compter les occurrences
    count = content.count('welcome_message,')

    if count == 0:
        print("✅ Aucune correction nécessaire - Le fichier est déjà corrigé!")
        return True

    print(f"⚠️  Trouvé {count} occurrence(s) de 'welcome_message,' à corriger")

    # Créer une sauvegarde
    backup_path = file_path + '.before_fix'
    try:
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"💾 Sauvegarde créée: {backup_path}")
    except Exception as e:
        print(f"⚠️  Impossible de créer la sauvegarde: {e}")

    # Appliquer la correction
    fixed_content = content.replace('welcome_message,', 'message,')

    # Vérifier que la correction a fonctionné
    new_count = fixed_content.count('welcome_message,')
    if new_count > 0:
        print(f"⚠️  Attention: {new_count} occurrence(s) restante(s)")

    # Écrire le fichier corrigé
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"✅ Fichier corrigé avec succès!")
        print(f"✅ {count} occurrence(s) corrigée(s)")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'écriture: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 CORRECTION DU BUG WELCOME_MESSAGE")
    print("=" * 60)
    print()

    # Déterminer le chemin du fichier
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Par défaut, chercher tdb.py dans le répertoire courant
        file_path = 'tdb.py'

    # Convertir en chemin absolu
    file_path = os.path.abspath(file_path)

    # Appliquer la correction
    success = fix_welcome_message_bug(file_path)

    print()
    print("=" * 60)
    if success:
        print("✅ CORRECTION TERMINÉE")
        print()
        print("🚀 Vous pouvez maintenant relancer votre bot:")
        print("   py tdb.py")
    else:
        print("❌ ÉCHEC DE LA CORRECTION")
        print()
        print("💡 Essayez de corriger manuellement:")
        print("   1. Ouvrez tdb.py dans un éditeur")
        print("   2. Recherchez: welcome_message,")
        print("   3. Remplacez par: message,")
        print("   4. Sauvegardez")
    print("=" * 60)

    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())
