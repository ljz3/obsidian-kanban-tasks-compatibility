import { Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { Effects, Extension, State } from 'micromark-util-types';

import { getSelf } from './helpers';

export function emojiDateExtension(emoji: string): Extension {
  const emojiCode = emoji.codePointAt(0);

  function tokenize(effects: Effects, ok: State, nok: State) {
    let dateChars = 0;

    return start;

    function start(code: number) {
      if (code !== emojiCode) return nok(code);

      effects.enter('emojiDate' as any);
      effects.enter('emojiDateMarker' as any);
      effects.consume(code);
      effects.exit('emojiDateMarker' as any);

      return afterEmoji;
    }

    function afterEmoji(code: number) {
      if (!markdownSpace(code)) return nok(code);

      effects.enter('emojiDateData' as any);
      effects.enter('emojiDateTarget' as any);
      return consumeDate(code);
    }

    function consumeDate(code: number) {
      // Skip initial spaces
      if (dateChars === 0 && markdownSpace(code)) {
        effects.consume(code);
        return consumeDate;
      }

      // Date format: YYYY-MM-DD (10 characters)
      // Check if it's a digit or dash
      if ((code >= 48 && code <= 57) || code === 45) {
        // 0-9 or -
        effects.consume(code);
        dateChars++;
        return consumeDate;
      }

      // Must have at least 10 chars (YYYY-MM-DD)
      if (dateChars < 10) return nok(code);

      // Date must be followed by space, newline, or end
      if (!markdownSpace(code) && !markdownLineEnding(code) && code !== null) {
        return nok(code);
      }

      effects.exit('emojiDateTarget' as any);
      effects.exit('emojiDateData' as any);
      effects.exit('emojiDate' as any);
      return ok(code);
    }
  }

  return {
    text: { [emojiCode]: { tokenize } },
  };
}

export function emojiDateFromMarkdown(): FromMarkdownExtension {
  function enterEmojiDate(token: Token) {
    this.enter(
      {
        type: 'emojiDate',
        value: null,
      },
      token
    );
  }

  function exitEmojiDateTarget(token: Token) {
    const target = this.sliceSerialize(token).trim();
    const current = getSelf(this.stack);
    (current as any).date = target;
  }

  function exitEmojiDate(token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      emojiDate: enterEmojiDate,
    },
    exit: {
      emojiDateTarget: exitEmojiDateTarget,
      emojiDate: exitEmojiDate,
    },
  };
}
