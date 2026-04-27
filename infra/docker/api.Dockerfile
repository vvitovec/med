FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/adapters/package.json packages/adapters/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @trust-coupons/shared \
  && npm run build -w @trust-coupons/config \
  && npm run build -w @trust-coupons/adapters \
  && npm run build -w @trust-coupons/admin \
  && npm run build -w @trust-coupons/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/admin/dist ./apps/admin/dist
COPY --from=build /app/packages ./packages
EXPOSE 3100
