// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Database, Brain, Search, TrendingUp, Activity, Trophy, Calendar, BarChart3 } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "🎉 Bienvenue sur l'Assistant Intelligent Football !\n\nJe peux vous aider avec :\n✅ Statistiques détaillées des équipes\n✅ Historique des matchs\n✅ Analyses de performance\n✅ Comparaisons d'équipes\n\n⏳ Initialisation du système en cours...\nVeuillez patientez quelques instants pendant le chargement de la base de données (230k+ matchs)."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamStats, setTeamStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkAPIStatus();
    loadDatasetInfo();
    loadAvailableTeams();
    const interval = setInterval(checkAPIStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAvailableTeams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/teams`);
      if (response.ok) {
        const data = await response.json();
        if (data.teams && data.teams.length > 0) {
          // Filtre les équipes françaises en priorité
          const frenchTeams = data.teams.filter(team => 
            ['Paris', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 
             'Rennes', 'Lens', 'Toulouse', 'Bordeaux', 'Nantes', 
             'Strasbourg', 'Montpellier', 'Brest', 'Reims', 'Angers',
             'Lorient', 'Troyes', 'Metz', 'Saint-Etienne'].some(keyword => 
              team.toLowerCase().includes(keyword.toLowerCase())
            )
          );
          setAvailableTeams(frenchTeams.length > 0 ? frenchTeams : data.teams);
        }
      }
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
    }
  };

  const checkAPIStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const newStatus = data.initialized ? 'online' : 'initializing';
        
        // Si le statut change, afficher un message
        if (apiStatus === 'initializing' && newStatus === 'online') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Système initialisé avec succès !\n\nVous pouvez maintenant poser vos questions sur les équipes et les matchs. 🎉'
          }]);
        }
        
        setApiStatus(newStatus);
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setApiStatus('offline');
      } else {
        setApiStatus('offline');
      }
    }
  };

  const loadDatasetInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dataset/info`);
      if (response.ok) {
        const data = await response.json();
        setDatasetInfo(data);
      }
    } catch (error) {
      console.error('Erreur chargement info dataset:', error);
    }
  };

  const exampleQuestions = [
    "Statistiques de Paris SG",
    "Matchs de Marseille",
    "Résultats en division F1",
    "Lyon vs Monaco historique",
    "Performance de Nice"
  ];

  const [availableTeams, setAvailableTeams] = useState([]);
  
  // Noms exacts des équipes depuis le CSV
  const defaultTeams = [
    'Paris SG', 'Marseille', 'Lyon', 'Monaco', 'Lille',
    'Nice', 'Rennes', 'Lens', 'Toulouse', 'Bordeaux',
    'Nantes', 'Strasbourg', 'Montpellier', 'Brest', 'Paris FC',
    'Reims', 'Angers', 'Lorient', 'Troyes', 'Metz'
  ];
  
  const popularTeams = availableTeams.length > 0 ? availableTeams.slice(0, 20) : defaultTeams;

  const callAPI = async (query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Erreur API');
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  };

  const fetchTeamStats = async (teamName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/${teamName}`);
      if (response.ok) {
        const data = await response.json();
        setTeamStats(data);
        return data;
      }
    } catch (error) {
      console.error('Erreur stats équipe:', error);
      return null;
    }
  };

  const searchMatches = async (teamName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/search/matches?query=${encodeURIComponent(teamName)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Erreur recherche matchs:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (apiStatus !== 'online') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ L'API backend n'est pas prête.\n\n" +
                 (apiStatus === 'initializing' 
                   ? "🔄 Le système s'initialise, veuillez patienter..."
                   : "❌ Le serveur est hors ligne. Démarrez-le avec:\n\n```\npython backend.py\n```")
      }]);
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await callAPI(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "❌ Erreur de communication avec l'API.\n\nVérifiez que le backend est actif sur http://localhost:8000"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (question) => {
    setInput(question);
  };

  const handleTeamSelect = async (team) => {
    setSelectedTeam(team);
    setLoading(true);
    
    // Vérifier d'abord que l'API est en ligne
    if (apiStatus !== 'online') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ L'API n'est pas encore prête.\n\nStatut actuel : ${apiStatus === 'initializing' ? 'Initialisation en cours...' : 'Hors ligne'}\n\nVeuillez patienter quelques instants.`
      }]);
      setLoading(false);
      return;
    }
    
    try {
      const stats = await fetchTeamStats(team);
      await searchMatches(team);
      
      if (stats && !stats.error) {
        let message = `📊 **Statistiques détaillées de ${team}**\n\n`;
        message += `🏆 Matchs joués: ${stats.total_matches || 0}\n`;
        message += `✅ Victoires: ${stats.wins || 0}\n`;
        message += `➖ Nuls: ${stats.draws || 0}\n`;
        message += `❌ Défaites: ${stats.losses || 0}\n`;
        message += `⚽ Buts marqués: ${stats.goals_scored || 0}\n`;
        message += `🥅 Buts encaissés: ${stats.goals_conceded || 0}\n`;
        message += `📈 Différence: ${stats.goal_difference || 0}\n`;
        message += `📊 Taux de victoire: ${stats.win_rate || 0}%\n`;
        
        if (stats.current_elo) {
          message += `⭐ Elo Rating: ${stats.current_elo.toFixed(2)}`;
        }
        
        setMessages(prev => [...prev, 
          { role: 'user', content: `Statistiques ${team}` },
          { role: 'assistant', content: message }
        ]);
      } else {
        // L'équipe n'a pas été trouvée, essayons une recherche alternative
        const searchResults = await fetch(`${API_BASE_URL}/search/matches?query=${encodeURIComponent(team)}&limit=3`);
        const searchData = await searchResults.json();
        
        if (searchData.matches && searchData.matches.length > 0) {
          let message = `🔍 Résultats de recherche pour "${team}":\n\n`;
          message += `J'ai trouvé ${searchData.count} matchs contenant ce nom.\n\n`;
          searchData.matches.slice(0, 3).forEach((match, idx) => {
            message += `${idx + 1}. ${match.home_team} vs ${match.away_team}\n`;
            message += `   Score: ${match.score} - ${match.date}\n\n`;
          });
          message += `💡 Essayez avec le nom exact d'une équipe de la liste.`;
          
          setMessages(prev => [...prev, 
            { role: 'user', content: `Recherche: ${team}` },
            { role: 'assistant', content: message }
          ]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ Aucune donnée trouvée pour "${team}".\n\n💡 Suggestions :\n• Vérifiez l'orthographe\n• Essayez un autre nom de la liste\n• Utilisez la recherche dans le chat`
          }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur lors de la récupération des données.\n\nDétails: ${error.message}\n\nAssurez-vous que le backend est actif.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch(apiStatus) {
      case 'online': return 'from-green-500 to-emerald-500';
      case 'initializing': return 'from-yellow-500 to-orange-500 animate-pulse';
      case 'checking': return 'from-blue-500 to-indigo-500 animate-pulse';
      default: return 'from-red-500 to-rose-500';
    }
  };

  const getStatusText = () => {
    switch(apiStatus) {
      case 'online': return '✅ API En ligne';
      case 'initializing': return '⏳ Initialisation... (2-5 min)';
      case 'checking': return '🔍 Vérification...';
      default: return '❌ API Hors ligne';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className={`bg-gradient-to-r ${getStatusColor()} p-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    Assistant Football IA
                    <span className="text-xl">⚽</span>
                  </h1>
                  <p className="text-sm text-white/90 mt-1">
                    Analyse intelligente • RAG • 230k+ matchs
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 flex-wrap">
                <div className={`px-4 py-2 rounded-xl backdrop-blur-sm shadow-lg transition-all ${
                  apiStatus === 'online' ? 'bg-white/20' : 
                  apiStatus === 'initializing' ? 'bg-white/15' : 
                  apiStatus === 'checking' ? 'bg-white/10' : 'bg-white/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all ${
                      apiStatus === 'online' ? 'bg-green-300 animate-pulse shadow-lg shadow-green-500/50' :
                      apiStatus === 'initializing' ? 'bg-yellow-300 animate-pulse' : 
                      apiStatus === 'checking' ? 'bg-blue-300 animate-pulse' : 'bg-red-300'
                    }`}></div>
                    <span className="text-sm font-semibold">{getStatusText()}</span>
                  </div>
                  {apiStatus === 'initializing' && (
                    <div className="mt-1 text-xs text-white/70">
                      Indexation des données...
                    </div>
                  )}
                </div>

                {datasetInfo && (
                  <>
                    <div className="bg-white/15 px-4 py-2 rounded-xl backdrop-blur-sm shadow-lg">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span className="font-bold">{datasetInfo.total_matches?.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-white/80">Matchs</div>
                    </div>
                    <div className="bg-white/15 px-4 py-2 rounded-xl backdrop-blur-sm shadow-lg">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        <span className="font-bold">{datasetInfo.total_teams}</span>
                      </div>
                      <div className="text-xs text-white/80">Équipes</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Popular Teams */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-lg">Équipes</h3>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {popularTeams.map((team, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTeamSelect(team)}
                    className={`w-full px-4 py-3 text-left rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      selectedTeam === team
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'bg-slate-600/40 hover:bg-slate-600/60 text-gray-300'
                    } border border-slate-500`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{team}</span>
                      {selectedTeam === team && <Activity className="w-4 h-4" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team Stats */}
            {teamStats && !teamStats.error && (
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30 shadow-xl">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Stats Rapides
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-gray-300">Matchs</span>
                    <span className="font-bold text-white">{teamStats.total_matches}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-gray-300">Victoires</span>
                    <span className="font-bold text-green-400">{teamStats.wins}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-gray-300">Nuls</span>
                    <span className="font-bold text-yellow-400">{teamStats.draws}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-lg">
                    <span className="text-gray-300">Défaites</span>
                    <span className="font-bold text-red-400">{teamStats.losses}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                    <span className="text-gray-300">Taux victoire</span>
                    <span className="font-bold text-blue-400">{teamStats.win_rate}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Matches */}
            {recentMatches.length > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-xl">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-400" />
                  Derniers Matchs
                </h3>
                <div className="space-y-2 text-xs">
                  {recentMatches.slice(0, 5).map((match, idx) => (
                    <div key={idx} className="p-2 bg-slate-600/30 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">{match.home_team}</span>
                        <span className="font-bold text-white">{match.score}</span>
                        <span className="text-gray-300">{match.away_team}</span>
                      </div>
                      <div className="text-gray-500 mt-1 text-center">{match.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Examples */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">Questions suggérées</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(q)}
                    className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-purple-500 hover:to-blue-500 text-white text-sm rounded-lg transition-all duration-200 border border-slate-500 hover:border-purple-400 transform hover:scale-105 shadow-md"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="bg-slate-700/50 rounded-xl border border-slate-600 overflow-hidden shadow-xl">
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-2xl p-4 rounded-2xl shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                          : 'bg-slate-700 text-gray-100 border border-slate-600'
                      }`}
                    >
                      <div className="whitespace-pre-line text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                    
                    {msg.role === 'user' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3 justify-start animate-fadeIn">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-slate-700 p-4 rounded-2xl border border-slate-600 shadow-lg">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                        <span className="text-sm">Analyse en cours avec RAG...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 shadow-xl">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Posez votre question sur le football..."
                  className="flex-1 px-5 py-4 bg-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 border border-slate-500"
                  disabled={loading || apiStatus !== 'online'}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || apiStatus !== 'online'}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-bold shadow-lg transform hover:scale-105"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              <div className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-2">
                <Brain className="w-4 h-4" />
                <span>RAG System actif • 230k+ matchs • Analyse intelligente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;