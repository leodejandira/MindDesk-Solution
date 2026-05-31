/*
  Criação das variavéis que realizam a conexão com o banco de dados
  o arquivo esta vindo do .env
*/
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;