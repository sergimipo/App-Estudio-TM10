# TM10 INS Mollet (Next.js)

Pega un tema y practica con preguntas tipo test, verdadero/falso, respuesta corta y respuesta abierta.
La IA (Google Gemini) genera las preguntas y corrige las respuestas, y siempre te muestra la solución.

## Puesta en marcha

1. Abre `.env.local` y pega tu clave justo después de `GOOGLE_API_KEY=`
   (sustituye `PEGA_AQUI_TU_API_KEY`, sin comillas ni espacios).
   Consigue la clave en <https://aistudio.google.com/apikey>.
2. Instala y arranca:

```
npm install
npm run dev
```

Abre <http://localhost:3000>. Si cambias `.env.local` con el servidor en marcha, reinícialo.

Si no existe `.env.local`, copia `.env.example` con ese nombre.

## Temas guardados para tus compañeros

Pon los temas como archivos `.md` o `.txt` en la carpeta `temas/` y sube los cambios a GitHub.
Vercel vuelve a desplegar solo y la web los muestra en una lista: tus compañeros eligen uno y generan
preguntas sin pegar nada. Si la primera línea es `# Título`, ese es el nombre en la lista; si no, se usa
el nombre del archivo. Los archivos que empiezan por `_` no se muestran. Si no hay ningún tema,
la web ofrece solo el cuadro para pegar texto.

## Estructura

```
app/
  page.tsx               Interfaz (configuración, cuestionario, resultados)
  layout.tsx, globals.css
  api/generate/route.ts  Genera las preguntas
  api/grade/route.ts     Corrige respuestas cortas y abiertas
lib/
  ai.ts                  Llamada a la API de Google Gemini (solo servidor)
  validate.ts            Valida y baraja las preguntas
  ratelimit.ts           Límite sencillo de peticiones por IP
  types.ts               Tipos y constantes compartidas
```

## Variables de entorno

| Variable             | Para qué                         | Por defecto             |
| -------------------- | -------------------------------- | ----------------------- |
| `GOOGLE_API_KEY`     | Tu clave de Google (obligatoria) | —                       |
| `GOOGLE_MODEL`       | Modelo que genera preguntas      | `gemini-3.8-flash`      |
| `GOOGLE_GRADE_MODEL` | Modelo que corrige               | `gemini-3.5-flash-lite` |

Si un modelo da error 404, cambia el nombre en `.env.local` sin tocar el código.
Para ver qué modelos puede usar tu clave:

```
curl "https://generativelanguage.googleapis.com/v1beta/models?key=TU_CLAVE"
```

## Errores habituales

- **404**: el modelo no existe o no está disponible para tu clave. Cambia `GOOGLE_MODEL`.
- **429**: límite gratuito alcanzado. Espera un minuto o usa un modelo Flash-Lite.
- **503**: modelo saturado. La app reintenta sola; si persiste, prueba más tarde.
- **400/403**: clave no válida. Crea otra en AI Studio.

## Desplegar en Vercel

Sube el proyecto a GitHub, impórtalo en Vercel y añade `GOOGLE_API_KEY`
(y opcionalmente los modelos) en Settings > Environment Variables. Haz redeploy después de cambiarlas.

`.env.local` está en `.gitignore`: tu clave no se sube a GitHub. No la pegues en el código.

Ojo: si lo despliegas público, cualquiera que abra la web gasta TU cuota de API.
Hay un límite ligero por IP en `lib/ratelimit.ts`, pero antes de compartir el enlace
conviene añadir contraseña o login.
