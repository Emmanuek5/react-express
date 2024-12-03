# React Express Integration

A TypeScript-based integration between React and Express with real-time capabilities using Socket.IO.

## Features

- Real-time state management with WebSocket support
- Hot Module Reloading (HMR)
- Server-side rendering with EJS
- TypeScript support
- Express middleware integration

## Installation

```bash
npm install
```

## Development

1. Build the project:
```bash
npm run build
```

2. Start the test server:
```bash
cd test-server
npm run dev
```

## Usage

```typescript
import { reactExpress } from 'react-express';

const app = express();
app.use(reactExpress({
  viewsDir: 'views',
  hmr: true
}));
```

## Requirements

- Node.js >= 14.0.0
- npm >= 6.0.0

## Scripts

- `npm run build` - Build the TypeScript files
- `npm run prepare` - Prepare the package for publishing

## License

MIT