/** 文件说明：秒级时间戳 Hook，用于驱动倒计时刷新。 */
import { useEffect, useState } from 'react';

export function useNowTimestamp(): number {
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  return nowTimestamp;
}

