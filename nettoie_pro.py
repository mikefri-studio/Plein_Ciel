#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""nettoie_pro.py — retire toute la vitrine PRO de Plein Ciel.

   1) index.html      : supprime le bouton « ⭐ Passer PRO »
   2) ui-settings.js  : supprime le déclencheur, la modale et proLine
   3) sw.js           : bump du cache (force le rafraîchissement chez tous les utilisateurs)

   Git fait office de sauvegarde : en cas de souci →
   git checkout -- index.html js/ui/ui-settings.js sw.js
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def remove_block_containing(src, anchor):
    """Supprime le plus petit bloc à accolades équilibrées contenant `anchor`."""
    idx = src.find(anchor)
    if idx == -1:
        return src, False

    debuts = [m.start() for m in re.finditer(
        r'\(function\b|function\s+\w+', src[:idx + len(anchor)])]
    start = debuts[-1] if debuts else idx

    depth, in_str, i = 0, None, start
    while i < len(src):
        c = src[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
        else:
            if c in '"\'`':
                in_str = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    while end < len(src) and src[end] in ');':
                        end += 1
                    return src[:start] + src[end:], True
        i += 1
    return src, False


def main():
    html = ROOT / 'index.html'
    uis = ROOT / 'js' / 'ui' / 'ui-settings.js'
    sw = ROOT / 'sw.js'

    for f in (html, uis, sw):
        if not f.exists():
            sys.exit(f'❌ Fichier introuvable : {f}\n'
                     f'   Lancez le script depuis la racine du dépôt (là où est index.html).')

    # 1) index.html : ligne du bouton PRO
    lignes = html.read_text(encoding='utf-8').splitlines(keepends=True)
    gardees = [l for l in lignes if 'id="proBtn"' not in l]
    html.write_text(''.join(gardees), encoding='utf-8')
    print(f'index.html      : {len(lignes) - len(gardees)} ligne(s) supprimée(s)')

    # 2) ui-settings.js : les 3 blocs PRO
    src = uis.read_text(encoding='utf-8')
    for ancre in ("$('#proBtn')", 'proModal', 'proLine'):
        src, ok = remove_block_containing(src, ancre)
        print('ui-settings.js  : bloc « ' + ancre + ' » ' +
              ('supprimé' if ok else 'introuvable (déjà nettoyé)'))
    uis.write_text(re.sub(r'\n{3,}', '\n\n', src), encoding='utf-8')

    # 3) sw.js : bump du cache
    t = sw.read_text(encoding='utf-8')
    m = re.search(r"const CACHE = 'pleinciel-([\d.]+)'", t)
    if m:
        parts = m.group(1).split('.')
        parts[-1] = str(int(parts[-1]) + 1)
        nouvelle = '.'.join(parts)
        t = t.replace("pleinciel-" + m.group(1), "pleinciel-" + nouvelle)
        sw.write_text(t, encoding='utf-8')
        print('sw.js           : cache ' + m.group(1) + ' → ' + nouvelle)
    else:
        print('sw.js           : cache introuvable')

    # 4) vérification finale
    restes = set()
    for f in (html, uis):
        txt = f.read_text(encoding='utf-8')
        for k in ('proBtn', 'proModal', 'proSoon', 'proLine', 'openPro'):
            if k in txt:
                restes.add(k)
    if not restes:
        print('✅ Aucune référence PRO restante.')
    else:
        print('⚠️ Références restantes : ' + ', '.join(sorted(restes)))


if __name__ == '__main__':
    main()