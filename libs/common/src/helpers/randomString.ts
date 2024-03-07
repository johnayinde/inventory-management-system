/**
 * It takes a string, adds a random string to the beginning of it, and replaces spaces with
 * underscores.
 * @param {string} word - string - The word you want to randomize
 * @returns A string that is a random string of characters and the word passed in with spaces replaced
 * with underscores.
 */
export const randomStrings = (word: string) => {
  return (
    (Math.random() + 1).toString(36).substring(7) +
    '-' +
    word.split(' ').join('_')
  );
};
