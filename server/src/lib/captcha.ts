import { randomInt } from 'node:crypto';
import { hashPassword, comparePassword } from './password';

const CAPTCHA_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const normalizeCaptchaAnswer = (answer: string) =>
  answer.replace(/\s+/g, '').toLowerCase();

export const generateCaptchaText = (length = 4) =>
  Array.from({ length }, () => CAPTCHA_ALPHABET[randomInt(0, CAPTCHA_ALPHABET.length)]).join('').toLowerCase();

export const renderCaptchaSvg = (answer: string) => {
  const chars = answer.toUpperCase().split('');
  const charNodes = chars.map((char, index) => {
    const x = 28 + index * 38;
    const y = 52 + (index % 2 === 0 ? 2 : -4);
    const rotate = index % 2 === 0 ? -8 : 7;
    return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="76" viewBox="0 0 190 76" role="img" aria-label="captcha">
  <rect width="190" height="76" rx="22" fill="#F9F8F6"/>
  <path d="M18 52C58 20 106 78 172 28" stroke="#E6D5B8" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M20 24C66 50 110 6 170 50" stroke="#8FA88B" stroke-opacity="0.38" stroke-width="5" stroke-linecap="round" fill="none"/>
  <g font-family="Inter, ui-sans-serif, system-ui" font-size="34" font-weight="800" fill="#4A4540" letter-spacing="2">${charNodes}</g>
</svg>`;
};

export const createCaptchaChallenge = async (answer = generateCaptchaText()) => {
  const normalized = normalizeCaptchaAnswer(answer);
  return {
    answer: normalized,
    answerHash: await hashPassword(normalized),
    svg: renderCaptchaSvg(normalized),
  };
};

export const verifyCaptchaAnswer = (answer: string, answerHash: string) =>
  comparePassword(normalizeCaptchaAnswer(answer), answerHash);
