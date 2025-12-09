import { v4 as uuidv4 } from 'uuid';
import { Attack, AttackSeverity, AttackType } from '../types';
import { getRandomCountry, getRandomCountryExcept } from './countries';

// Generate a random attack type
const getRandomAttackType = (): AttackType => {
  const attackTypes = Object.values(AttackType);
  return attackTypes[Math.floor(Math.random() * attackTypes.length)];
};

// Generate a random severity level
const getRandomSeverity = (): AttackSeverity => {
  const severities = Object.values(AttackSeverity);
  return severities[Math.floor(Math.random() * severities.length)];
};

// Generate a random timestamp within the last 24 hours
const getRandomTimestamp = (): Date => {
  const now = new Date();
  const pastHours = Math.floor(Math.random() * 24);
  const pastMinutes = Math.floor(Math.random() * 60);
  const pastSeconds = Math.floor(Math.random() * 60);
  
  return new Date(
    now.getTime() - 
    (pastHours * 60 * 60 * 1000) - 
    (pastMinutes * 60 * 1000) - 
    (pastSeconds * 1000)
  );
};

// Generate a single random attack
export const generateRandomAttack = (): Attack => {
  const source = getRandomCountry();
  const target = getRandomCountryExcept(source);
  
  return {
    id: uuidv4(),
    source,
    target,
    type: getRandomAttackType(),
    severity: getRandomSeverity(),
    timestamp: getRandomTimestamp()
  };
};

// Generate initial set of attacks
export const generateInitialAttacks = (count: number): Attack[] => {
  const attacks: Attack[] = [];
  
  for (let i = 0; i < count; i++) {
    attacks.push(generateRandomAttack());
  }
  
  return attacks.slice(-count); // Ensure we only return the requested number of attacks
};