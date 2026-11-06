export interface UsernameValidationResult {
  normalized: string;
  isValid: boolean;
  reason?: string;
}

/**
 * Strips leading '@' and whitespace, without auto-lowercasing if we want to warn,
 * or normalizes input for search.
 */
export function cleanUsernameInput(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

/**
 * Validates a username against the BotUsernameRegistry.sol rules:
 * - Between 3 and 20 characters
 * - Only lowercase letters (a-z), numbers (0-9), and underscores (_)
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const cleaned = cleanUsernameInput(raw);

  if (!cleaned) {
    return {
      normalized: '',
      isValid: false,
      reason: 'Enter a username between 3 and 20 characters.',
    };
  }

  if (/[A-Z]/.test(cleaned)) {
    return {
      normalized: cleaned.toLowerCase(),
      isValid: false,
      reason: 'Only lowercase letters (a–z), numbers (0–9), and underscores (_) are allowed.',
    };
  }

  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return {
      normalized: cleaned.toLowerCase(),
      isValid: false,
      reason: 'Only lowercase letters (a–z), numbers (0–9), and underscores (_) are allowed. No spaces or special characters.',
    };
  }

  if (cleaned.length < 3) {
    return {
      normalized: cleaned,
      isValid: false,
      reason: `Too short (${cleaned.length}/3 minimum characters).`,
    };
  }

  if (cleaned.length > 20) {
    return {
      normalized: cleaned,
      isValid: false,
      reason: `Too long (${cleaned.length}/20 maximum characters).`,
    };
  }

  return {
    normalized: cleaned,
    isValid: true,
  };
}

export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatBlockchainTimestamp(timestampSeconds?: bigint | number | null): string {
  if (!timestampSeconds || Number(timestampSeconds) === 0) {
    return 'Retrieved from blockchain';
  }
  const date = new Date(Number(timestampSeconds) * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildPublicProfileUrl(username: string): string {
  const normalized = cleanUsernameInput(username).toLowerCase();
  if (typeof window === 'undefined') {
    return `https://hashname.app/u/${normalized}`;
  }
  return `${window.location.origin}/u/${normalized}`;
}

