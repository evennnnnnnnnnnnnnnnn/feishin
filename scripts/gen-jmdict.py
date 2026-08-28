#!/usr/bin/env python3
"""
Convert JMdict_e (http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz) into the
compact JSON bundled with the app
(src/renderer/features/lyrics/assets/jmdict-compact.json), following the
KANJIDIC2 pipeline pattern (scripts/gen-kanjidic.py in the Museeks reference).

Usage:
  curl -sLO http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
  python3 scripts/gen-jmdict.py JMdict_e.gz

Compaction (target: single-digit MB):
  - only entries carrying a JMdict priority tag (ichi/news/spec/gai/nf) on any
    kanji or reading element are kept (common-vocab filter)
  - at most MAX_SENSES senses per entry, MAX_GLOSSES glosses per sense
  - part-of-speech is stored as the short JMdict entity codes (v1, n, prt, ...)
    by neutralizing DTD-declared entity references before XML parsing
  - search-only forms (sK/sk) are excluded
  - the displayed reading honours re_restr (must be valid for the primary
    kanji form) and senses restricted by stagk/stagr to other forms are
    dropped, so the compact entry never pairs a form with a reading or sense
    that does not apply to it

Output format:
  {
    "entries": [[kanji or "", reading, [[posCodes, [gloss, ...]], ...]], ...],
    "index": { "<keb or reb>": [entryIdx, ...], ... }
  }

The lookup hook keys on the kuromoji token's dictionary (base) form with
surface-form and kana fallbacks, so the index maps every retained kanji and
reading form to its entries.

The JMdict file is the property of EDRDG, licensed under CC BY-SA 4.0.
Attribution is required in the app (see the lyrics settings form).
"""

import gzip
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MAX_SENSES = 5
MAX_GLOSSES = 4
MAX_FORMS = 3  # kebs/rebs indexed per entry
MAX_HOMOGRAPHS = 8  # entries indexed per key

NOTICE = (
    "This file is derived from the JMdict dictionary (JMdict_e), property of "
    "the Electronic Dictionary Research and Development Group (EDRDG), used "
    "under CC BY-SA 4.0 (https://www.edrdg.org/jmdict/j_jmdict.html). Entries "
    "are filtered to priority vocabulary and senses/glosses are abridged; see "
    "scripts/gen-jmdict.py."
)

# Collapse only the entities the JMdict DTD itself declares (&v1; &prt; &uk;
# ...) to their bare codes, so senses carry short POS tags instead of the
# expanded English descriptions. The five XML built-ins and anything not in
# the DTD are left for the XML parser, so gloss text cannot be corrupted by
# an unexpected entity name.
ENTITY_DECL_RE = re.compile(r"<!ENTITY\s+([0-9A-Za-z-]+)\s")
ENTITY_REF_RE = re.compile(r"&([0-9A-Za-z-]+);")
XML_BUILTINS = {"amp", "lt", "gt", "quot", "apos"}


def neutralize_dtd_entities(xml_text: str) -> str:
    declared = set(ENTITY_DECL_RE.findall(xml_text)) - XML_BUILTINS
    return ENTITY_REF_RE.sub(
        lambda m: m.group(1) if m.group(1) in declared else m.group(0), xml_text
    )


def main(source: str) -> None:
    opener = gzip.open if source.endswith(".gz") else open
    with opener(source, "rb") as f:
        xml_text = neutralize_dtd_entities(f.read().decode("utf-8"))

    root = ET.fromstring(xml_text)

    entries = []
    index = {}

    for entry in root.iter("entry"):
        kebs = []
        has_priority = False
        for k_ele in entry.iter("k_ele"):
            keb = k_ele.findtext("keb")
            infs = [inf.text for inf in k_ele.iter("ke_inf")]
            if keb is None or "sK" in infs:
                continue
            if k_ele.find("ke_pri") is not None:
                has_priority = True
            kebs.append(keb)

        rebs = []
        unrestricted_rebs = []
        for r_ele in entry.iter("r_ele"):
            reb = r_ele.findtext("reb")
            infs = [inf.text for inf in r_ele.iter("re_inf")]
            if reb is None or "sk" in infs:
                continue
            if r_ele.find("re_pri") is not None:
                has_priority = True
            # re_restr limits a reading to specific kanji forms; only a reading
            # valid for the primary (first) keb may represent the entry
            restr = [r.text for r in r_ele.iter("re_restr")]
            if not restr or (kebs and kebs[0] in restr):
                unrestricted_rebs.append(reb)
            rebs.append(reb)

        if not has_priority or not rebs:
            continue

        primary_keb = kebs[0] if kebs else ""
        primary_reb = unrestricted_rebs[0] if unrestricted_rebs else rebs[0]

        senses = []
        previous_pos = ""
        for sense in entry.iter("sense"):
            glosses = [g.text for g in sense.iter("gloss") if g.text]
            # An empty <pos> list means "same as the previous sense" in JMdict,
            # so track it before any skip below
            pos = ";".join(p.text for p in sense.iter("pos") if p.text) or previous_pos
            previous_pos = pos
            if not glosses:
                continue
            # stagk/stagr restrict a sense to specific forms; drop senses that
            # do not apply to the primary forms the compact entry presents
            stagk = [t.text for t in sense.iter("stagk")]
            stagr = [t.text for t in sense.iter("stagr")]
            if stagk and primary_keb not in stagk:
                continue
            if stagr and primary_reb not in stagr:
                continue
            senses.append([pos, glosses[:MAX_GLOSSES]])
            if len(senses) >= MAX_SENSES:
                break

        if not senses:
            continue

        entry_idx = len(entries)
        entries.append([primary_keb, primary_reb, senses])

        for key in kebs[:MAX_FORMS] + rebs[:MAX_FORMS]:
            slot = index.setdefault(key, [])
            if entry_idx not in slot and len(slot) < MAX_HOMOGRAPHS:
                slot.append(entry_idx)

    out_path = (
        Path(__file__).parent.parent
        / "src"
        / "renderer"
        / "features"
        / "lyrics"
        / "assets"
        / "jmdict-compact.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(
            {"entries": entries, "index": index, "notice": NOTICE},
            f,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    size_kib = out_path.stat().st_size // 1024
    print(f"{len(entries)} entries, {len(index)} index keys -> {out_path} ({size_kib} KiB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "JMdict_e.gz")
