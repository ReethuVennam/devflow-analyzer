import { useState, useEffect } from 'react';
import axios from 'axios';
import { CommitChart } from './components/CommitChart';
import { LanguageChart } from './components/LanguageChart';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [token, setToken] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState(null);
  const [languages, setLanguages] = useState(null);
  const [prs, setPrs] = useState(null); // NEW: State for PR analysis
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      setToken(urlToken);
      const fetchData = async () => {
        try {
          const authHeaders = { headers: { Authorization: `Bearer ${urlToken}` } };
          const userResponse = await axios.get('http://localhost:5001/api/user', authHeaders);
          setUser(userResponse.data);
          const reposResponse = await axios.get('http://localhost:5001/api/repos', authHeaders);
          setRepos(reposResponse.data);
        } catch (err) {
          setError('Failed to fetch initial data.');
        }
      };
      fetchData();
    }
  }, []);

  const handleRepoClick = async (repo) => {
    setSelectedRepo(repo);
    setCommits([]);
    setStats(null);
    setIssues(null);
    setLanguages(null);
    setPrs(null); // NEW: Clear old PR data
    setIsLoading(true);
    setError('');

    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const commitsPromise = axios.get(`http://localhost:5001/api/repos/${repo.owner.login}/${repo.name}/commits`, authHeaders);
      const statsPromise = axios.get(`http://localhost:5001/api/repos/${repo.owner.login}/${repo.name}/stats`, authHeaders);
      const issuesPromise = axios.get(`http://localhost:5001/api/repos/${repo.owner.login}/${repo.name}/issues`, authHeaders);
      const languagesPromise = axios.get(`http://localhost:5001/api/repos/${repo.owner.login}/${repo.name}/languages`, authHeaders);
      const prsPromise = axios.get(`http://localhost:5001/api/repos/${repo.owner.login}/${repo.name}/prs`, authHeaders); // NEW: Add PRs API call

      const [commitsResponse, statsResponse, issuesResponse, languagesResponse, prsResponse] = await Promise.all([commitsPromise, statsPromise, issuesPromise, languagesPromise, prsPromise]);
      
      setCommits(commitsResponse.data);
      setStats(statsResponse.data);
      setIssues(issuesResponse.data);
      setLanguages(languagesResponse.data);
      setPrs(prsResponse.data); // NEW: Set PR data
    } catch (err) {
      setError('Failed to fetch repository details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setRepos([]);
    setSelectedRepo(null);
    setCommits([]);
    setStats(null);
    setIssues(null);
    setLanguages(null);
    setPrs(null);
    setError('');
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <>
      <h1>DevFlow Analyzer</h1>
      {user ? (
        <div className="main-content">
          <div className="sidebar">
            <div>
              <div className="profile">
                <h2>Welcome, {user.name}!</h2>
                <p>Logged in as {user.login}</p>
                <img src={user.avatar_url} alt="User Avatar" width={100} />
              </div>
              <div className="repo-list">
                <h3>Your Repositories:</h3>
                <ul>
                  {repos.map(repo => (
                    <li key={repo.id}>
                      <button onClick={() => handleRepoClick(repo)}>
                        {repo.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>
          <div className="commit-view">
            {selectedRepo ? (
              <div>
                <h2>Details for {selectedRepo.name}</h2>
                {isLoading ? <p>Analyzing repository...</p> : (
                  <>
                    <div className="stats-container">
                      {stats && (
                        <div className="stats-box">
                          <h3>Repository Stats</h3>
                          <p><strong>Total Commits:</strong> {stats.totalCommits}</p>
                          <p><strong>Project Lifespan:</strong> {stats.lifespanInDays} days</p>
                          <p><strong>Top Contributor:</strong> {stats.topContributor}</p>
                        </div>
                      )}
                      {issues && (
                        <div className="issues-box">
                            <h3>Issue Analysis</h3>
                            <p><strong>Open Issues:</strong> {issues.openCount}</p>
                            <p><strong>Closed Issues:</strong> {issues.closedCount}</p>
                            <p><strong>Avg. Close Time:</strong> {issues.avgCloseTimeInDays} days</p>
                        </div>
                      )}
                      {/* NEW: Display PR analysis */}
                      {prs && (
                        <div className="prs-box">
                            <h3>Pull Request Analysis</h3>
                            <p><strong>Open PRs:</strong> {prs.openCount}</p>
                            <p><strong>Merged PRs:</strong> {prs.mergedCount}</p>
                            <p><strong>Avg. Merge Time:</strong> {prs.avgMergeTimeInDays} days</p>
                        </div>
                      )}
                    </div>
                    <div className="charts-container">
                      {languages && languages.length > 0 && (
                        <div className="chart-container">
                          <LanguageChart languageData={languages} />
                        </div>
                      )}
                      {stats && stats.chart && (
                        <div className="chart-container">
                          <CommitChart chartData={stats.chart} />
                        </div>
                      )}
                    </div>
                    <h3>Commit History</h3>
                    <ul className="commit-list">
                      {commits.map(commit => (
                        <li key={commit.sha}>
                          <p><strong>{commit.message}</strong></p>
                          <p>by {commit.author} on {new Date(commit.date).toLocaleDateString()}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <p>Select a repository to see its stats and commit history.</p>
            )}
          </div>
        </div>
      ) : (
        <a className="login-button" href="http://localhost:5001/api/auth/github">
          Login with GitHub
        </a>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}

export default App;