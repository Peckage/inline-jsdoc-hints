/**
 * Greets a person by name. Returns a formatted greeting string.
 *
 * @param name The person's name.
 * @returns A greeting string.
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * Computes the sum of two numbers. Handles negative values correctly.
 *
 * @param a The first operand.
 * @param b The second operand.
 * @returns The sum.
 */
export function add(a: number, b: number): number {
  return a + b;
}

// Trigger completions here:
const result = greet('world');
