from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import os
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================

app = FastAPI(title="CAN 2025 AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET_PATH = r"C:\Users\Lenovo\Downloads\match"
ELO_RATINGS_FILE = os.path.join(DATASET_PATH, "EloRatings.csv")
MATCHES_FILE = os.path.join(DATASET_PATH, "Matches.csv")

# ============================================
# CHARGEMENT DES DONNÉES
# ============================================

class DataLoader:
    def __init__(self):
        self.elo_ratings = None
        self.matches = None
        
    def load_data(self):
        """Charge les fichiers CSV"""
        try:
            print("📊 Chargement des données...")
            
            # Charge EloRatings
            self.elo_ratings = pd.read_csv(ELO_RATINGS_FILE)
            print(f"✅ EloRatings chargé: {len(self.elo_ratings)} lignes")
            
            # Charge Matches avec les vraies colonnes
            self.matches = pd.read_csv(MATCHES_FILE)
            print(f"✅ Matches chargé: {len(self.matches)} lignes")
            print(f"📋 Colonnes: {list(self.matches.columns[:10])}...")
            
            return True
        except Exception as e:
            print(f"❌ Erreur de chargement: {e}")
            return False
    
    def get_team_stats(self, team_name: str) -> Dict:
        """Récupère les statistiques d'une équipe"""
        if self.matches is None:
            return {"error": "Données non chargées"}
        
        try:
            # Filtre les matchs avec les vraies colonnes
            team_matches = self.matches[
                (self.matches['HomeTeam'] == team_name) | 
                (self.matches['AwayTeam'] == team_name)
            ]
            
            if len(team_matches) == 0:
                return {"error": f"Équipe '{team_name}' non trouvée"}
            
            # Calcul des statistiques
            total_matches = len(team_matches)
            
            # Victoires à domicile
            home_wins = len(team_matches[
                (team_matches['HomeTeam'] == team_name) & 
                (team_matches['FTHome'] > team_matches['FTAway'])
            ])
            
            # Victoires à l'extérieur
            away_wins = len(team_matches[
                (team_matches['AwayTeam'] == team_name) & 
                (team_matches['FTAway'] > team_matches['FTHome'])
            ])
            
            wins = home_wins + away_wins
            
            # Nuls
            draws = len(team_matches[
                team_matches['FTHome'] == team_matches['FTAway']
            ])
            
            losses = total_matches - wins - draws
            
            # Buts marqués et encaissés
            goals_scored = (
                team_matches[team_matches['HomeTeam'] == team_name]['FTHome'].sum() +
                team_matches[team_matches['AwayTeam'] == team_name]['FTAway'].sum()
            )
            
            goals_conceded = (
                team_matches[team_matches['HomeTeam'] == team_name]['FTAway'].sum() +
                team_matches[team_matches['AwayTeam'] == team_name]['FTHome'].sum()
            )
            
            # Elo rating actuel
            current_elo = None
            if self.elo_ratings is not None:
                team_elo = self.elo_ratings[self.elo_ratings['club'] == team_name]
                if len(team_elo) > 0:
                    current_elo = team_elo.iloc[-1]['elo']
            
            # Derniers matchs
            last_matches = []
            for _, match in team_matches.tail(5).iterrows():
                if match['HomeTeam'] == team_name:
                    result = "V" if match['FTHome'] > match['FTAway'] else ("N" if match['FTHome'] == match['FTAway'] else "D")
                    last_matches.append({
                        "date": match['MatchDate'],
                        "opponent": match['AwayTeam'],
                        "score": f"{match['FTHome']}-{match['FTAway']}",
                        "venue": "Domicile",
                        "result": result
                    })
                else:
                    result = "V" if match['FTAway'] > match['FTHome'] else ("N" if match['FTAway'] == match['FTHome'] else "D")
                    last_matches.append({
                        "date": match['MatchDate'],
                        "opponent": match['HomeTeam'],
                        "score": f"{match['FTAway']}-{match['FTHome']}",
                        "venue": "Extérieur",
                        "result": result
                    })
            
            return {
                "team": team_name,
                "total_matches": int(total_matches),
                "wins": int(wins),
                "draws": int(draws),
                "losses": int(losses),
                "goals_scored": int(goals_scored),
                "goals_conceded": int(goals_conceded),
                "goal_difference": int(goals_scored - goals_conceded),
                "win_rate": round(wins / total_matches * 100, 2) if total_matches > 0 else 0,
                "current_elo": float(current_elo) if current_elo else None,
                "last_matches": last_matches
            }
        except Exception as e:
            print(f"Erreur get_team_stats: {e}")
            return {"error": f"Erreur: {str(e)}"}
    
    def search_matches(self, query: str, limit: int = 10) -> List[Dict]:
        """Recherche des matchs"""
        if self.matches is None:
            return []
        
        try:
            query_lower = query.lower()
            
            # Recherche dans HomeTeam, AwayTeam et Division
            filtered = self.matches[
                self.matches['HomeTeam'].astype(str).str.lower().str.contains(query_lower, na=False) |
                self.matches['AwayTeam'].astype(str).str.lower().str.contains(query_lower, na=False) |
                self.matches['Division'].astype(str).str.lower().str.contains(query_lower, na=False)
            ]
            
            # Formate les résultats
            results = []
            for _, match in filtered.head(limit).iterrows():
                results.append({
                    "date": match['MatchDate'],
                    "home_team": match['HomeTeam'],
                    "away_team": match['AwayTeam'],
                    "score": f"{match['FTHome']}-{match['FTAway']}",
                    "division": match['Division'],
                    "home_elo": match['HomeElo'],
                    "away_elo": match['AwayElo']
                })
            
            return results
        except Exception as e:
            print(f"Erreur search_matches: {e}")
            return []
    
    def get_all_teams(self) -> List[str]:
        """Récupère la liste de toutes les équipes"""
        if self.matches is None:
            return []
        
        home_teams = set(self.matches['HomeTeam'].unique())
        away_teams = set(self.matches['AwayTeam'].unique())
        all_teams = sorted(list(home_teams.union(away_teams)))
        
        return all_teams

# ============================================
# SYSTÈME RAG
# ============================================

class RAGSystem:
    def __init__(self, data_loader: DataLoader):
        self.data_loader = data_loader
        self.embedding_model = None
        self.chroma_client = None
        self.collection = None
        
    def initialize(self):
        """Initialise le système RAG"""
        try:
            print("🧠 Initialisation du modèle d'embeddings...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            print("💾 Initialisation de ChromaDB...")
            self.chroma_client = chromadb.Client(Settings(
                anonymized_telemetry=False,
                allow_reset=True
            ))
            
            try:
                self.collection = self.chroma_client.get_collection("football_matches")
                print("✅ Collection existante récupérée")
            except:
                self.collection = self.chroma_client.create_collection("football_matches")
                print("✅ Nouvelle collection créée")
                self._index_data()
            
            return True
        except Exception as e:
            print(f"❌ Erreur RAG: {e}")
            return False
    
    def _index_data(self):
        """Indexe les données dans ChromaDB"""
        print("📑 Indexation des données...")
        
        if self.data_loader.matches is None:
            return
        
        # Échantillon pour indexation
        sample_size = min(10000, len(self.data_loader.matches))
        sample_matches = self.data_loader.matches.sample(sample_size)
        
        documents = []
        metadatas = []
        ids = []
        
        for idx, row in sample_matches.iterrows():
            try:
                # Crée un texte descriptif
                doc = f"Match {row['HomeTeam']} vs {row['AwayTeam']} " \
                      f"le {row['MatchDate']} en {row['Division']}. " \
                      f"Score final: {row['FTHome']}-{row['FTAway']}. " \
                      f"Elo domicile: {row['HomeElo']}, Elo extérieur: {row['AwayElo']}. " \
                      f"Mi-temps: {row['HTHome']}-{row['HTAway']}"
                
                documents.append(doc)
                metadatas.append({
                    "home_team": str(row['HomeTeam']),
                    "away_team": str(row['AwayTeam']),
                    "date": str(row['MatchDate']),
                    "division": str(row['Division']),
                    "score": f"{row['FTHome']}-{row['FTAway']}"
                })
                ids.append(f"match_{idx}")
            except Exception as e:
                continue
        
        # Indexation par batches
        batch_size = 1000
        for i in range(0, len(documents), batch_size):
            self.collection.add(
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size],
                ids=ids[i:i+batch_size]
            )
        
        print(f"✅ {len(documents)} documents indexés")
    
    def retrieve_context(self, query: str, n_results: int = 5) -> str:
        """Récupère le contexte pertinent"""
        if self.collection is None:
            return ""
        
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            if not results['documents'] or len(results['documents'][0]) == 0:
                return "Aucun contexte trouvé."
            
            return "\n\n".join(results['documents'][0])
        except Exception as e:
            print(f"Erreur retrieve_context: {e}")
            return ""

# ============================================
# GESTIONNAIRE PRINCIPAL
# ============================================

class AssistantManager:
    def __init__(self):
        self.data_loader = DataLoader()
        self.rag_system = RAGSystem(self.data_loader)
        self.initialized = False
    
    def initialize(self):
        """Initialise tous les composants"""
        print("🚀 Initialisation de l'assistant...")
        
        if not self.data_loader.load_data():
            return False
        
        if not self.rag_system.initialize():
            print("⚠️ RAG non initialisé, mode basique activé")
        
        self.initialized = True
        print("✅ Assistant prêt!")
        return True
    
    def process_query(self, query: str) -> Dict:
        """Traite une requête"""
        if not self.initialized:
            return {"error": "Assistant non initialisé"}
        
        try:
            # Récupère le contexte
            context = self.rag_system.retrieve_context(query)
            
            # Génère la réponse
            response = self._generate_response(query, context)
            
            return {
                "query": query,
                "response": response,
                "context": context[:500] if context else "",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Erreur process_query: {e}")
            return {"error": str(e)}
    
    def _generate_response(self, query: str, context: str) -> str:
        """Génère une réponse intelligente"""
        query_lower = query.lower()
        
        # Détection de statistiques d'équipe
        if any(word in query_lower for word in ['statistiques', 'stats', 'performance', 'résultats']):
            # Essaie d'extraire le nom d'équipe
            teams = self.data_loader.get_all_teams()
            for team in teams:
                if team.lower() in query_lower:
                    stats = self.data_loader.get_team_stats(team)
                    if 'error' not in stats:
                        response = f"📊 **Statistiques de {stats['team']}**\n\n"
                        response += f"🏆 Matchs joués: {stats['total_matches']}\n"
                        response += f"✅ Victoires: {stats['wins']}\n"
                        response += f"➖ Nuls: {stats['draws']}\n"
                        response += f"❌ Défaites: {stats['losses']}\n"
                        response += f"⚽ Buts marqués: {stats['goals_scored']}\n"
                        response += f"🥅 Buts encaissés: {stats['goals_conceded']}\n"
                        response += f"📈 Différence de buts: {stats['goal_difference']}\n"
                        response += f"📊 Taux de victoire: {stats['win_rate']}%\n"
                        if stats['current_elo']:
                            response += f"⭐ Elo actuel: {stats['current_elo']:.2f}\n"
                        
                        if stats['last_matches']:
                            response += f"\n🔄 **Derniers matchs:**\n"
                            for match in stats['last_matches']:
                                response += f"  {match['result']} - {match['date']}: vs {match['opponent']} ({match['score']}) - {match['venue']}\n"
                        
                        return response
        
        # Si contexte RAG disponible
        if context and len(context) > 50:
            return f"📚 **Informations trouvées:**\n\n{context}\n\n💡 Besoin de plus de détails? Précisez votre question!"
        
        # Réponse par défaut
        return ("🤔 Je n'ai pas trouvé d'informations spécifiques.\n\n"
                "💡 **Suggestions:**\n"
                "- Demandez les statistiques d'une équipe (ex: 'stats de Paris SG')\n"
                "- Recherchez des matchs (ex: 'matchs de Marseille')\n"
                "- Posez des questions sur des divisions (ex: 'résultats F1')")

# ============================================
# API ENDPOINTS
# ============================================

assistant = AssistantManager()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    query: str
    response: str
    context: str
    timestamp: str

@app.on_event("startup")
async def startup_event():
    assistant.initialize()

@app.get("/")
async def root():
    return {
        "message": "Assistant Football API",
        "status": "online" if assistant.initialized else "initializing",
        "version": "3.0.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "initialized": assistant.initialized,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/query", response_model=QueryResponse)
async def query_assistant(request: QueryRequest):
    if not assistant.initialized:
        raise HTTPException(status_code=503, detail="Assistant non initialisé")
    
    result = assistant.process_query(request.query)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.get("/stats/{team_name}")
async def get_team_stats(team_name: str):
    if not assistant.initialized:
        raise HTTPException(status_code=503, detail="Assistant non initialisé")
    
    return assistant.data_loader.get_team_stats(team_name)

@app.get("/search/matches")
async def search_matches(query: str, limit: int = 10):
    if not assistant.initialized:
        raise HTTPException(status_code=503, detail="Assistant non initialisé")
    
    matches = assistant.data_loader.search_matches(query, limit)
    return {"matches": matches, "count": len(matches)}

@app.get("/teams")
async def get_teams():
    """Liste toutes les équipes"""
    if not assistant.initialized:
        raise HTTPException(status_code=503, detail="Assistant non initialisé")
    
    teams = assistant.data_loader.get_all_teams()
    return {"teams": teams, "count": len(teams)}

@app.get("/dataset/info")
async def dataset_info():
    if assistant.data_loader.matches is not None:
        return {
            "total_matches": len(assistant.data_loader.matches),
            "total_teams": len(assistant.data_loader.get_all_teams()),
            "divisions": list(assistant.data_loader.matches['Division'].unique()),
            "date_range": {
                "start": str(assistant.data_loader.matches['MatchDate'].min()),
                "end": str(assistant.data_loader.matches['MatchDate'].max())
            },
            "columns": list(assistant.data_loader.matches.columns)
        }
    return {"error": "Données non chargées"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Démarrage de l'API...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)