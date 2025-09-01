import path from "path";
import express from "express";
import { Server } from "http";
import { reactExpress } from "react-express";

const app = express();
const port = 3000;
const server = new Server(app);

app.set("server", server);

app.use(express.static(path.join(__dirname, "public")));
// Body parsers for form and JSON submissions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const middleware = reactExpress({
    viewsDir: path.join(__dirname, 'views'),
    hmr: true
});

// Apply the middleware
middleware(app);

app.get("/", (req, res) => {
    res.render("index");
});

// Router demo pages
app.get('/page-a', (_req, res) => {
    res.render('page-a');
});
app.get('/page-b', (_req, res) => {
    res.render('page-b');
});

// --- Example APIs ---
// Suspense data API
app.get('/api/profile', async (_req, res) => {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400));
    res.json({
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        avatar: 'https://i.pravatar.cc/96?img=68'
    });
});

// Form submit API (accepts JSON or urlencoded)
app.post('/api/submit', (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    res.json({ ok: true, data: { name, email, message: message || '' } });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});