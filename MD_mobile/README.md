# MindDesk Mobile (React Native + Expo)

App Android do MindDesk, com as mesmas funcionalidades do `MD_front_end`. Assim como o site, ele fala **apenas com o back-end Node** (`MD_back_end`); o back-end continua sendo quem acessa o Supabase e os microsserviços de IA.

- Expo SDK 58, Expo Router (rotas por arquivo em `src/app/`)
- Token JWT guardado no `expo-secure-store`
- Sem bibliotecas de UI ou de gráficos: componentes próprios em `src/components/ui.tsx`

## Rodar no celular (Expo Go)

```bash
cd MD_mobile
npm install
cp .env.example .env      # ajuste EXPO_PUBLIC_API_URL
npx expo start            # leia o QR Code com o app Expo Go
```

`EXPO_PUBLIC_API_URL` precisa ser um endereço que **o celular** alcance. Use o IP da máquina na rede Wi-Fi (por exemplo, `http://192.168.0.10:3000`), nunca `localhost`. O back-end sobe normalmente com `docker compose up` na raiz do projeto.

### Sem Supabase e sem OpenAI (modo mock)

```bash
npm run mock              # API falsa na porta 4000, com as mesmas rotas do back-end
# .env → EXPO_PUBLIC_API_URL=http://<ip-da-maquina>:4000
```

Usuários do mock (senha `123456`): `admin@md.com` (gerente) e `ana@md.com` (funcionária).

## Testes

```bash
npm test                  # unitários (regras de negócio, JWT, cliente HTTP)
npm run typecheck

# E2E: build web + mock + navegador headless, em tela de celular
EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo export -p web --output-dir dist-web
npx playwright install chromium   # só na primeira vez
npm run test:e2e
```

O E2E percorre login, chat, QR de ponto, cursos, configurações, relatórios (com aprovação de atestado), CRUD de funcionários, documentos/cursos e humanograma. As telas ficam salvas em `e2e/shots/`.

## Gerar o APK (EAS)

1. Publique o back-end com **HTTPS**. O Android bloqueia HTTP em builds de release.
2. Troque `https://SEU-BACKEND-AQUI` em `eas.json` pela URL real.
3. Rode:

```bash
npx eas-cli@latest login
npm run build:apk         # perfil "preview" → APK instalável
```

## Estrutura

```
src/app/                 telas (Expo Router)
  login.tsx
  (app)/_layout.tsx      guard de login e de gerente (Stack.Protected)
  (app)/manager.tsx      home + mural de avisos
  (app)/chat.tsx         assistente + envio de atestado (câmera, galeria ou PDF)
  (app)/qrcode.tsx       ticket de ponto (renova a cada 50s)
  (app)/cursos.tsx       Meus Cursos (funcionário)
  (app)/documentos.tsx   Documentos & Cursos (gerente)
  (app)/funcionarios.tsx · relatorios.tsx · humanograma.tsx · configuracoes.tsx
src/components/          ui.tsx (primitivos), cursos.tsx, DateField.tsx
src/lib/                 api.ts (cliente HTTP), auth.tsx, logic.ts (regras puras, testadas), theme.tsx
e2e/                     mock-api.js + smoke.js
```

## Diferenças intencionais em relação ao site

- **QR de ponto:** é gerado no próprio aparelho. O site enviava o ticket para o `api.qrserver.com`, um serviço de terceiros.
- **Upload de atestado:** `usuario_id` e `tenant_id` vêm do JWT. O site enviava o placeholder `usuario-logado-id` e o `TENANT_ID = 1` fixo.
- **"Limite" do curso (funcionário):** calculado como `created_at + prazo_dias`, a mesma conta do back-end. No site essa data aparecia inválida.
- **Gráficos:** substituídos por barras simples, com os mesmos dados.
