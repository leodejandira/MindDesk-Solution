const express = require('express');
const usuariosRoutes = require('./routes/usuarios.routes');
const authRoutes = require('./routes/auth');
const pdfsRoutes = require('./routes/pdfs.routes');
const pontosRoutes = require('./routes/pontos.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const cursosRoutes = require('./routes/cursos.routes');
const avisosRoutes = require('./routes/avisos.routes');
const atestadoRoutes = require('./routes/atestados.routes')
//Frank

//Leo
const cors = require('cors');
const chatRoutes = require('./routes/chat.routes');
//Leo

const app = express();
const PORT = 3000;

//Leo
app.use(cors());
//Leo

app.use(express.json());

// usa as rotas
app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);

//Leo
app.use('/chat', chatRoutes); 
//Leo
app.use('/pdfs', pdfsRoutes);
app.use('/pontos', pontosRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/cursos', cursosRoutes);
app.use('/avisos', avisosRoutes);
app.use ('/atestados',atestadoRoutes);

//Frank

// rota teste
app.get('/', (req, res) => {
    res.send('API rodando 🚀');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});