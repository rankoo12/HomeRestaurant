# Home Restaurant — backend (Fastify) production image.
# Multi-stage: a build stage with full deps (tsc) and a lean runtime stage.
# Railway: root directory = backend, Dockerfile path = Dockerfile.

# ---- build stage ---------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

# Install ALL deps (incl. devDependencies like typescript) for the build.
COPY package.json package-lock.json ./
RUN npm ci

# Compile TS -> dist/ and copy SQL migrations into dist/db/migrations/.
COPY . .
RUN npm run build

# ---- runtime stage -------------------------------------------------------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production deps only (argon2 needs a native build; node:20-slim has the
# toolchain via prebuilt binaries, so npm ci --omit=dev suffices).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output (includes dist/db/migrations/ used by `npm run release`).
COPY --from=build /app/dist ./dist

EXPOSE 4000
# preDeployCommand (npm run release) and startCommand (npm run start) come from
# railway.json; both resolve against this image's package.json + dist/.
CMD ["npm", "run", "start"]
