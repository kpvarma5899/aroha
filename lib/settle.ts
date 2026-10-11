export async function settle<T>(label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    console.error(`[${label}]`, error);
    return null;
  }
}
