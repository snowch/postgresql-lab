#!/usr/bin/env bash
set -euo pipefail
# This helper runs as the postgres OS user inside the isolated lab container.
standby_dir=/tmp/postgresql-lab-standby
primary() { psql -X -U postgres -d lab -At -v ON_ERROR_STOP=1 "$@"; }
secondary() { psql -X -h 127.0.0.1 -p 5433 -U postgres -d lab -At -v ON_ERROR_STOP=1 "$@"; }
case "${1:-}" in
  start)
    if [[ -e "$standby_dir" ]]; then
      echo 'Standby directory already exists. Use the clean action before a fresh replay.' >&2
      exit 1
    fi
    pg_basebackup -h 127.0.0.1 -U postgres -D "$standby_dir" -R -X stream --checkpoint=fast
    pg_ctl -D "$standby_dir" -l /tmp/postgresql-lab-standby.log \
      -o '-p 5433 -c listen_addresses=127.0.0.1 -c shared_preload_libraries=pg_stat_statements' -w start
    ;;
  pause)
    secondary -c 'SELECT pg_wal_replay_pause();'
    for attempt in {1..100}; do
      if [[ "$(secondary -c "SELECT pg_get_wal_replay_pause_state() = 'paused'")" == t ]]; then exit 0; fi
      sleep .1
    done
    echo 'Standby did not pause before timeout.' >&2; exit 1
    ;;
  resume) secondary -c 'SELECT pg_wal_replay_resume();' ;;
  caught-up)
    target_lsn="$(primary -c 'SELECT pg_current_wal_lsn()')"
    for attempt in {1..100}; do
      if [[ "$(secondary -c "SELECT pg_last_wal_replay_lsn() >= '$target_lsn'::pg_lsn")" == t ]]; then
        echo "Replayed through $target_lsn"; exit 0
      fi
      sleep .1
    done
    echo "Standby did not replay $target_lsn before timeout." >&2; exit 1
    ;;
  promote) secondary -c 'SELECT pg_promote(true, 10);' ;;
  stop)
    if pg_ctl -D "$standby_dir" status >/dev/null 2>&1; then pg_ctl -D "$standby_dir" -m fast -w stop; fi
    ;;
  clean)
    if pg_ctl -D "$standby_dir" status >/dev/null 2>&1; then pg_ctl -D "$standby_dir" -m fast -w stop; fi
    rm -rf -- "$standby_dir"
    ;;
  *) echo 'Usage: standby.sh start|pause|resume|caught-up|promote|stop|clean' >&2; exit 1 ;;
esac
