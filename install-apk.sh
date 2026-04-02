#!/bin/bash

# Script para instalar o APK do Ditado Inteligente no telefone Android via ADB

echo "🚀 Instalador do Ditado Inteligente"
echo "===================================="
echo ""

# Verificar se adb está instalado
if ! command -v adb &> /dev/null; then
    echo "❌ Erro: ADB não está instalado ou não está no PATH"
    echo "   Instale o Android SDK Platform Tools"
    echo "   https://developer.android.com/tools/releases/platform-tools"
    exit 1
fi

# Verificar se o APK existe
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ Erro: APK não encontrado em $APK_PATH"
    echo ""
    echo "Você precisa compilar o APK primeiro:"
    echo "  1. Execute: pnpm build"
    echo "  2. Execute: cd android && ./gradlew assembleDebug"
    echo "  3. Tente novamente"
    exit 1
fi

# Verificar se há dispositivos conectados
echo "📱 Procurando dispositivos Android..."
DEVICES=$(adb devices | grep -v "List of attached" | grep -v "^$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ Erro: Nenhum dispositivo Android encontrado"
    echo ""
    echo "Certifique-se de:"
    echo "  1. Conectar o telefone via USB"
    echo "  2. Ativar 'Modo de Desenvolvedor' no telefone"
    echo "  3. Ativar 'Depuração USB'"
    echo "  4. Confirmar a conexão no telefone"
    exit 1
fi

echo "✅ Dispositivo(s) encontrado(s)"
echo ""

# Desinstalar versão anterior (opcional)
echo "🔄 Desinstalando versão anterior (se existir)..."
adb uninstall com.ditadointeligente 2>/dev/null

# Instalar o APK
echo ""
echo "📦 Instalando Ditado Inteligente..."
echo "   Arquivo: $APK_PATH"
echo "   Tamanho: $(du -h "$APK_PATH" | cut -f1)"
echo ""

if adb install "$APK_PATH"; then
    echo ""
    echo "✅ Instalação bem-sucedida!"
    echo ""
    echo "🎉 Ditado Inteligente está pronto para usar!"
    echo ""
    echo "Próximas ações:"
    echo "  1. Abra o app no seu telefone"
    echo "  2. Faça login com sua conta Google"
    echo "  3. Comece a transcrever com voz"
    echo ""
    echo "💡 Dica: Use 'adb logcat' para ver logs do app"
else
    echo ""
    echo "❌ Erro durante a instalação"
    echo ""
    echo "Possíveis causas:"
    echo "  1. Dispositivo desconectado"
    echo "  2. Espaço insuficiente no telefone"
    echo "  3. Versão incompatível do Android"
    echo ""
    echo "Tente novamente ou instale manualmente:"
    echo "  1. Copie o arquivo $APK_PATH para seu telefone"
    echo "  2. Abra o gerenciador de arquivos"
    echo "  3. Toque no arquivo para instalar"
    exit 1
fi
