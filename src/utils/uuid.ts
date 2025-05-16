/**
 * Simple UUID generator
 * Note: This is a simplified implementation and not cryptographically secure,
 * but sufficient for our game ID purposes
 */
export function generateUUID(): string {
  const s4 = () => 
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
      
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}
