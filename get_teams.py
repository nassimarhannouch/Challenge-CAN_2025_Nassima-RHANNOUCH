import pandas as pd

# Chemin vers votre fichier
MATCHES_FILE = r"C:\Users\Lenovo\Downloads\match\Matches.csv"

print("=" * 60)
print("EXTRACTION DES NOMS D'ÉQUIPES")
print("=" * 60)

# Charge le fichier
matches = pd.read_csv(MATCHES_FILE)

# Récupère tous les noms d'équipes uniques
home_teams = set(matches['HomeTeam'].dropna().unique())
away_teams = set(matches['AwayTeam'].dropna().unique())
all_teams = sorted(list(home_teams.union(away_teams)))

print(f"\n📊 Total d'équipes trouvées : {len(all_teams)}\n")

# Affiche les 50 premières équipes
print("🔤 Premières 50 équipes (ordre alphabétique) :\n")
for i, team in enumerate(all_teams[:50], 1):
    print(f"{i:2d}. {team}")

print("\n" + "=" * 60)
print("💡 Copiez ces noms exacts dans votre frontend!")
print("=" * 60)

# Recherche des équipes françaises populaires
french_keywords = ['Paris', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 
                   'Rennes', 'Lens', 'Toulouse', 'Bordeaux', 'Nantes', 
                   'Strasbourg', 'Montpellier', 'Brest', 'Saint-Etienne']

print("\n🇫🇷 Équipes françaises détectées :\n")
french_teams = []
for team in all_teams:
    for keyword in french_keywords:
        if keyword.lower() in team.lower():
            french_teams.append(team)
            print(f"  ✓ {team}")
            break

# Génère le code JavaScript pour le frontend
print("\n" + "=" * 60)
print("📝 CODE POUR App.js :")
print("=" * 60)
print("\nconst popularTeams = [")
for team in french_teams[:15]:
    print(f"  '{team}',")
print("];")