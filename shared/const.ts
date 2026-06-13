export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const PAYMENT_REQUIRED_ERR_MSG = 'Limite de ditados gratuitos atingido (10003)';
export const REGISTRATION_REQUIRED_ERR_MSG = 'Cadastro necessário para continuar (10004)';
export const PHONE_IN_USE_ERR_MSG = 'Este número de telefone já está cadastrado (10005)';
export const NO_SPEECH_DETECTED_MSG = 'Não conseguimos identificar nenhuma fala no áudio. Aproxime-se do microfone e tente novamente.';

// Both limits temporarily set high — re-enable when DB and billing are ready
export const FREE_DICTATION_LIMIT = 9999;
export const REGISTRATION_GRACE_LIMIT = 9999;
export const SUBSCRIPTION_PRICE_BRL = '2,99';
export const SUBSCRIPTION_SKU = 'ditado_inteligente_mensal';
