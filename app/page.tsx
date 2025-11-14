export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>LocalHub</h1>
      <p>ChatGPT App for Local Business Search</p>
      <p>This app is designed to work within ChatGPT. Test the API endpoints:</p>
      <ul>
        <li><a href="/api/mcp">/api/mcp</a> - MCP server endpoint</li>
        <li><a href="/api/localhub/resources/localhub-map">/api/localhub/resources/localhub-map</a> - Widget resource</li>
        <li><a href="/.well-known/oauth-protected-resource">/.well-known/oauth-protected-resource</a> - OAuth discovery</li>
      </ul>
    </main>
  )
}
