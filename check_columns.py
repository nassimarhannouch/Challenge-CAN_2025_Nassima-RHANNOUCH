import pandas as pd

# Chemin vers vos fichiers
MATCHES_FILE = r"C:\Users\Lenovo\Downloads\match\Matches.csv"
ELO_RATINGS_FILE = r"C:\Users\Lenovo\Downloads\match\EloRatings.csv"

print("=" * 60)
print("DIAGNOSTIC DES COLONNES CSV")
print("=" * 60)

# Vérifie le fichier Matches
print("\n📊 Fichier Matches.csv:")
try:
    matches = pd.read_csv(MATCHES_FILE, nrows=5)
    print(f"✅ Chargé avec succès")
    print(f"\n🔍 Colonnes disponibles:")
    for i, col in enumerate(matches.columns, 1):
        print(f"  {i}. '{col}'")
    
    print(f"\n📋 Aperçu des données:")
    print(matches.head(2))
    
except Exception as e:
    print(f"❌ Erreur: {e}")

# Vérifie le fichier EloRatings
print("\n" + "=" * 60)
print("📊 Fichier EloRatings.csv:")
try:
    elo = pd.read_csv(ELO_RATINGS_FILE, nrows=5)
    print(f"✅ Chargé avec succès")
    print(f"\n🔍 Colonnes disponibles:")
    for i, col in enumerate(elo.columns, 1):
        print(f"  {i}. '{col}'")
    
    print(f"\n📋 Aperçu des données:")
    print(elo.head(2))
    
except Exception as e:
    print(f"❌ Erreur: {e}")

print("\n" + "=" * 60)
print("💡 Utilisez ces noms de colonnes exacts dans votre code")
print("=" * 60)