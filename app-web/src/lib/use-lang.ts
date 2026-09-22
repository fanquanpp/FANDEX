import { useEffect, useState } from 'react';
import { getLang, subscribeLang, type Lang } from './i18n';

export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(getLang());
    return subscribeLang(setLang);
  }, []);

  return lang;
}
