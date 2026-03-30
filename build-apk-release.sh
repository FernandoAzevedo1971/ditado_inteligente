#!/bin/bash

# Script para gerar APK Assinado (Release) do Ditado Inteligente
# Uso: ./build-apk-release.sh

set -e

echo "🚀 Iniciando compilação do APK Assinado (Release)..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se keystore existe
KEYSTORE_PATH="android/app/ditado-inteligente.keystore"

if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Chave de assinatura não encontrada${NC}"
    echo "Gerando nova chave de assinatura..."
    echo ""
    
    read -p "Digite uma senha segura para a chave: " KEYSTORE_PASSWORD
    read -p "Digite seu nome completo: " FULL_NAME
    read -p "Digite sua unidade organizacional: " OU
    read -p "Digite sua organização: " ORG
    read -p "Digite sua cidade: " CITY
    read -p "Digite seu estado: " STATE
    read -p "Digite seu código de país (ex: BR): " COUNTRY
    
    cd android/app
    keytool -genkey -v -keystore ditado-inteligente.keystore \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -alias ditado-inteligente-key \
        -dname "CN=$FULL_NAME, OU=$OU, O=$ORG, L=$CITY, ST=$STATE, C=$COUNTRY" \
        -storepass "$KEYSTORE_PASSWORD" \
        -keypass "$KEYSTORE_PASSWORD"
    cd ../..
    
    echo -e "${GREEN}✓ Chave de assinatura criada${NC}"
    echo -e "${YELLOW}⚠️  Salve a senha em local seguro!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Chave de assinatura encontrada${NC}"
    echo ""
fi

# Passo 1: Instalar dependências
echo -e "${BLUE}[1/4]${NC} Instalando dependências Node.js..."
pnpm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

# Passo 2: Compilar build de produção
echo -e "${BLUE}[2/4]${NC} Compilando build de produção..."
pnpm build
echo -e "${GREEN}✓ Build compilado${NC}"
echo ""

# Passo 3: Sincronizar com Capacitor
echo -e "${BLUE}[3/4]${NC} Sincronizando com Capacitor..."
npx cap sync android
echo -e "${GREEN}✓ Sincronização concluída${NC}"
echo ""

# Passo 4: Compilar APK Assinado
echo -e "${BLUE}[4/4]${NC} Compilando APK Assinado..."
cd android
./gradlew assembleRelease
cd ..
echo -e "${GREEN}✓ APK assinado compilado com sucesso${NC}"
echo ""

# Localizar e exibir informações do APK
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${YELLOW}📦 Informações do APK:${NC}"
    echo "   Arquivo: $APK_PATH"
    echo "   Tamanho: $APK_SIZE"
    echo ""
    echo -e "${YELLOW}✅ APK pronto para distribuição!${NC}"
    echo "   Você pode:"
    echo "   1. Publicar na Google Play Store"
    echo "   2. Compartilhar com amigos"
    echo "   3. Distribuir via email ou link de download"
    echo ""
else
    echo -e "${RED}✗ Erro: APK não foi gerado${NC}"
    exit 1
fi
