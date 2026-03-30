#!/bin/bash

# Script para gerar APK de Debug do Ditado Inteligente
# Uso: ./build-apk-debug.sh

set -e

echo "🚀 Iniciando compilação do APK de Debug..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Passo 1: Instalar dependências
echo -e "${BLUE}[1/5]${NC} Instalando dependências Node.js..."
pnpm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

# Passo 2: Compilar build de produção
echo -e "${BLUE}[2/5]${NC} Compilando build de produção..."
pnpm build
echo -e "${GREEN}✓ Build compilado${NC}"
echo ""

# Passo 3: Sincronizar com Capacitor
echo -e "${BLUE}[3/5]${NC} Sincronizando com Capacitor..."
npx cap sync android
echo -e "${GREEN}✓ Sincronização concluída${NC}"
echo ""

# Passo 4: Compilar APK de Debug
echo -e "${BLUE}[4/5]${NC} Compilando APK de Debug..."
cd android
./gradlew assembleDebug
cd ..
echo -e "${GREEN}✓ APK compilado com sucesso${NC}"
echo ""

# Passo 5: Localizar e exibir informações do APK
echo -e "${BLUE}[5/5]${NC} Localizando arquivo APK..."
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${GREEN}✓ APK gerado com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}📦 Informações do APK:${NC}"
    echo "   Arquivo: $APK_PATH"
    echo "   Tamanho: $APK_SIZE"
    echo ""
    echo -e "${YELLOW}📱 Próximos passos:${NC}"
    echo "   1. Conecte seu telefone Android via USB"
    echo "   2. Ative 'Depuração USB' nas configurações do desenvolvedor"
    echo "   3. Execute: adb install $APK_PATH"
    echo "   Ou abra Android Studio e clique em 'Run'"
    echo ""
else
    echo -e "${RED}✗ Erro: APK não foi gerado${NC}"
    exit 1
fi
