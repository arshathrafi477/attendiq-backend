/**
 * Generates a memorable temporary password from student's name + roll number.
 * e.g.  name="Ananya Rajan", roll="CSE001"  →  "ananya@CSE001"
 */
module.exports = function generatePassword(name, roll) {
  const first = (name || 'student').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  const suffix = (roll || Math.floor(1000 + Math.random() * 9000)).toString();
  return `${first}@${suffix}`;
};
