import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Need Node runtime for full functionality

/**
 * MCP JSON-RPC 2.0 Server
 * Implements the Model Context Protocol for ChatGPT Apps SDK
 */

// Tool manifest
const TOOLS = [
  {
    name: 'localhub.search_places',
    title: 'Search Places',
    description: 'Search for local businesses and places using Google Places API. Accepts a query string and optional location parameters to find nearby businesses.',
    annotations: {
      readOnlyHint: true,
    },
    _meta: {
      'openai/outputTemplate': 'ui://widget/localhub-map.html',
      'openai/resultCanProduceWidget': true,
      'openai/widgetAccessible': true,
      'openai/toolInvocation/invoking': 'Searching places...',
      'openai/toolInvocation/invoked': 'Places loaded',
    },
    securitySchemes: [{ type: 'noauth' }],
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for places (e.g., "coffee shops", "restaurants")',
        },
        where: {
          type: 'string',
          description: 'Optional location string to resolve (e.g., "Dublin", "San Francisco")',
        },
        center: {
          type: 'object',
          description: 'Optional center coordinates for search',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        radius_m: {
          type: 'number',
          description: 'Search radius in meters (default 5000, min 100, max 50000)',
          default: 5000,
        },
        open_now: {
          type: 'boolean',
          description: 'Filter to only show places open now',
          default: false,
        },
        language: {
          type: 'string',
          description: 'Language code for results (e.g., "en", "es")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'localhub.get_place_details',
    title: 'Get Place Details',
    description: 'Get detailed information about a specific place including phone number, website, and opening hours. Use this when the user wants more details about a selected place.',
    annotations: {
      readOnlyHint: true,
    },
    _meta: {
      'openai/outputTemplate': 'ui://widget/localhub-map.html',
      'openai/resultCanProduceWidget': true,
      'openai/widgetAccessible': true,
      'openai/toolInvocation/invoking': 'Fetching place details...',
      'openai/toolInvocation/invoked': 'Details loaded',
    },
    securitySchemes: [{ type: 'noauth' }],
    inputSchema: {
      type: 'object',
      properties: {
        place_id: {
          type: 'string',
          description: 'Google Place ID of the place to get details for',
        },
      },
      required: ['place_id'],
    },
  },
];

/**
 * Handle MCP JSON-RPC 2.0 requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, id, method, params } = body;

    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request - must be JSON-RPC 2.0',
        },
      });
    }

    // Route to appropriate handler
    switch (method) {
      case 'initialize':
        return handleInitialize(id, params);

      case 'tools/list':
        return handleToolsList(id);

      case 'tools/call':
        return handleToolsCall(id, params);

      case 'resources/list':
        return handleResourcesList(id);

      case 'resources/read':
        return handleResourcesRead(id, params);

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        });
    }
  } catch (error) {
    console.error('MCP error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    }, { status: 500 });
  }
}

/**
 * Initialize handshake
 */
function handleInitialize(id: any, params: any) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'localhub',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  });
}

/**
 * List available tools
 */
function handleToolsList(id: any) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: {
      tools: TOOLS,
    },
  });
}

/**
 * Call a tool
 */
async function handleToolsCall(id: any, params: any) {
  const { name, arguments: args } = params;

  console.log('=== MCP TOOL CALL ===');
  console.log('Tool:', name);
  console.log('Args:', JSON.stringify(args, null, 2));

  try {
    let result;

    if (name === 'localhub.search_places') {
      // Call the search_places endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/localhub/tools/search_places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Search result:', {
        placesCount: data.places?.length || 0,
        hasSearch: !!data.search,
        hasPlaces: !!data.places,
      });

      result = {
        content: [
          {
            type: 'text',
            text: `Found ${data.places?.length || 0} places for "${args.query}"`,
          },
        ],
        structuredContent: data,
        _meta: {
          'openai/outputTemplate': 'ui://widget/localhub-map.html',
        },
      };

      console.log('Returning result with structuredContent and _meta:', {
        hasStructuredContent: !!result.structuredContent,
        structuredContentKeys: Object.keys(result.structuredContent || {}),
        hasMeta: !!result._meta,
      });
    } else if (name === 'localhub.get_place_details') {
      // Call the get_place_details endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/localhub/tools/get_place_details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        throw new Error(`Get place details failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Place details result:', {
        placeId: data.place_id,
        hasPhone: !!data.phone,
        hasWebsite: !!data.website,
      });

      result = {
        content: [
          {
            type: 'text',
            text: data.phone
              ? `Phone: ${data.phone}${data.website ? `, Website: ${data.website}` : ''}`
              : 'Details loaded',
          },
        ],
        structuredContent: { placeDetails: data },
        _meta: {
          'openai/outputTemplate': 'ui://widget/localhub-map.html',
        },
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: `Tool execution failed: ${error.message}`,
      },
    });
  }
}

/**
 * List available resources
 */
function handleResourcesList(id: any) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: {
      resources: [
        {
          uri: 'ui://widget/localhub-map.html',
          name: 'LocalHub Map Widget',
          mimeType: 'text/html+skybridge',
          description: 'Interactive map widget for displaying places and directions',
        },
      ],
    },
  });
}

/**
 * Read a resource (return widget HTML)
 */
async function handleResourcesRead(id: any, params: any) {
  const { uri } = params;

  if (uri === 'ui://widget/localhub-map.html') {
    // Fetch the widget HTML from our existing endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/localhub/resources/localhub-map`);
    const html = await response.text();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    console.log('=== RESOURCE READ ===');
    console.log('Base URL:', baseUrl);
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        contents: [
          {
            uri: 'ui://widget/localhub-map.html',
            mimeType: 'text/html+skybridge',
            text: html,
            _meta: {
              'openai/widgetPrefersBorder': true,
              'openai/widgetDomain': 'https://chatgpt.com',
              'openai/widgetCSP': {
                connect_domains: [
                  'https://maps.googleapis.com',
                  'https://maps.gstatic.com',
                  baseUrl, // Add our own domain for loading the JS bundle
                ],
                resource_domains: [
                  'https://maps.googleapis.com',
                  'https://maps.gstatic.com',
                  'https://fonts.googleapis.com',
                  'https://fonts.gstatic.com',
                  baseUrl, // Add our own domain for loading the JS bundle
                ],
              },
            },
          },
        ],
      },
    });
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32602,
      message: `Resource not found: ${uri}`,
    },
  });
}

/**
 * GET handler - some MCP clients may use GET for initial discovery
 */
export async function GET() {
  return NextResponse.json({
    name: 'localhub',
    version: '1.0.0',
    description: 'LocalHub MCP Server - Find local businesses',
    protocol: 'mcp',
    protocolVersion: '2024-11-05',
  });
}
