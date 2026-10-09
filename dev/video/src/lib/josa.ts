// 받침에 따라 조사 고르기 — 한글이 아닌 끝 글자(B2 등)는 소리로 끝이 모음(「투」)이라 받침 없음으로 본다
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const c = word.charCodeAt(word.length - 1);
  const final = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (final ? withFinal : withoutFinal);
}
