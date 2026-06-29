export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateGroups(members, mode, value) {
  const shuffled = shuffle(members);
  const n = Number(value);
  if (!n || n < 1) return [];

  if (mode === 'by_group_count') {
    const groups = Array.from({ length: n }, () => []);
    shuffled.forEach((member, index) => groups[index % n].push(member));
    return groups.filter(Boolean);
  }

  const groups = [];
  for (let i = 0; i < shuffled.length; i += n) {
    groups.push(shuffled.slice(i, i + n));
  }
  return groups;
}
