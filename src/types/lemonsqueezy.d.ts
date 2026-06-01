// Lemon Squeezy lemon.js (임베드 체크아웃) 전역 타입
interface Window {
  createLemonSqueezy?: () => void;
  LemonSqueezy?: {
    Url: { Open: (url: string) => void };
  };
}
