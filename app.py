from __future__ import annotations

import random
import time
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).parent

SPELLS = {
    "fire-spark": ("Fire Spark", "basic", 20, 1.5, "A quick flame projectile."),
    "acid-shot": ("Acid Shot", "basic", 20, 1.5, "A corrosive green arc."),
    "carbon-punch": ("Carbon Punch", "basic", 20, 1.5, "A hexagonal carbon shockwave."),
    "resonance-burst": ("Resonance Burst", "medium", 30, 5, "Curved arrows converge into an orb."),
    "nucleophile-strike": ("Nucleophile Strike", "medium", 30, 5, "A lone-pair spiral seeks its target."),
    "chiral-slash": ("Chiral Slash", "medium", 30, 5, "Mirrored R/S blades cross the arena."),
    "mechanism-storm": ("Mechanism Storm", "strong", 45, 10, "A vortex of mechanisms and intermediates."),
    "stereochemical-rift": ("Stereochemical Rift", "strong", 45, 10, "A mirrored molecular portal tears open."),
    "spectral-obliteration": ("Spectral Obliteration", "strong", 45, 10, "IR and NMR energy become a beam."),
}

CHAPTERS = [
    {"id": 1, "name": "Foundations of Organic Chemistry", "subtitle": "The Luminous Laboratory", "color": "#27d9cb", "bosses": [
        ("hybridization-goblin", "Hybridization Goblin", 120, 15, "Mini-Boss", "Orbitals spin around a goblin's tetrahedral staff."),
        ("functional-group-golem", "Functional Group Golem", 180, 15, "Mini-Boss", "Stone plates glow with reactive functional groups."),
        ("resonance-wraith", "Resonance Wraith", 250, 15, "Mini-Boss", "A spectral form shifts between resonance structures."),
        ("resonance-dragon", "Resonance Dragon", 450, 20, "MAJOR BOSS", "A massive dragon breathes glowing curved arrows."),
    ]},
    {"id": 2, "name": "Reaction Mechanisms", "subtitle": "The Kinetic Crucible", "color": "#9a7cff", "bosses": [
        ("sn1-knight", "SN1 Knight", 260, 30, "Mini-Boss", "A carbocation shield burns with unstable charge."),
        ("sn2-assassin", "SN2 Assassin", 320, 30, "Mini-Boss", "A backside attack flashes from the shadows."),
        ("e1-sorcerer", "E1 Sorcerer", 390, 30, "Mini-Boss", "Elimination glyphs orbit a reactive staff."),
        ("carbocation-shapeshifter", "Carbocation Shapeshifter", 470, 30, "Mini-Boss", "Its molecular skeleton rearranges in real time."),
        ("mechanism-titan", "Mechanism Titan", 600, 30, "MAJOR BOSS", "A giant of transition states and curved arrows."),
    ]},
    {"id": 3, "name": "Stereochemistry & Spectroscopy", "subtitle": "The Mirror Spectrum", "color": "#e34dff", "bosses": [
        ("chiral-chimera", "Chiral Chimera", 400, 45, "Mini-Boss", "Two mirrored heads argue across a stereocenter."),
        ("enantiomer-elf", "Enantiomer Elf", 480, 45, "Mini-Boss", "Left and right mirrored selves move as one."),
        ("ir-specter", "IR Specter", 550, 45, "Mini-Boss", "Spectral waves ripple through a translucent form."),
        ("nmr-oracle", "NMR Oracle", 650, 45, "Mini-Boss", "Magnetic rings reveal hidden chemical shifts."),
        ("stereochemistry-overlord", "Stereochemistry Overlord", 890, 45, "MAJOR BOSS", "An R/S split mask channels IR and NMR energy."),
    ]},
]

QUESTIONS = [
    ("What does sp3 hybridization describe?", ["Four equivalent hybrid orbitals", "A carbonyl resonance form", "A leaving group", "An IR absorption"], "Four equivalent hybrid orbitals"),
    ("A nucleophile is best described as…", ["An electron-pair donor", "An electron-pair acceptor", "A proton source", "A spectral peak"], "An electron-pair donor"),
    ("SN2 reactions are characterized by…", ["Backside attack and inversion", "A carbocation intermediate", "Two-step elimination", "Aromatic resonance only"], "Backside attack and inversion"),
    ("Enantiomers are molecules that are…", ["Non-superimposable mirror images", "Identical constitutional isomers", "Always achiral", "Different conformers only"], "Non-superimposable mirror images"),
    ("IR spectroscopy is especially useful for identifying…", ["Functional-group vibrations", "Molecular mass only", "Reaction yield", "Optical rotation alone"], "Functional-group vibrations"),
    ("In a resonance hybrid, the real molecule has…", ["Electron density spread across contributors", "Only one frozen structure", "No pi electrons", "Only single bonds"], "Electron density spread across contributors"),
]

EXPLANATIONS = {
    "What does sp3 hybridization describe?": "sp3 hybridization mixes one s orbital with three p orbitals to create four equivalent hybrid orbitals. Look for the answer describing four equivalent orbitals, not a resonance form or spectroscopy signal.",
    "A nucleophile is best described asâ€¦": "A nucleophile is electron-rich and donates a pair of electrons to form a bond. The key clue is donor: an electron-pair acceptor is an electrophile.",
    "SN2 reactions are characterized byâ€¦": "SN2 is a one-step backside attack. The incoming nucleophile attacks as the leaving group departs, causing inversion of configuration.",
    "Enantiomers are molecules that areâ€¦": "Enantiomers are non-superimposable mirror images. They have the same connectivity but differ in three-dimensional arrangement at their stereocenters.",
    "IR spectroscopy is especially useful for identifyingâ€¦": "IR spectroscopy measures bond vibrations, so it is especially useful for recognizing functional groups. It does not directly provide molecular mass or reaction yield.",
    "In a resonance hybrid, the real molecule hasâ€¦": "A resonance hybrid is the single real structure represented by multiple contributors. Electron density is delocalized across the contributing structures rather than frozen in only one of them.",
}

class Avatar(BaseModel):
    body: str = "arc"
    skin: str = "warm"
    hair: str = "nebula"
    outfit: str = "coat"
    accessory: str = "goggles"
    aura: str = "teal"
    config: dict = Field(default_factory=dict)

class SpellRequest(BaseModel):
    spell_id: str

class AnswerRequest(BaseModel):
    answer: str

class Session:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.avatar: Avatar | None = None
        self.finalized = False
        self.chapter = 1
        self.boss_index = 0
        self.player_hp = 150
        self.player_max_hp = 150
        self.boss_hp = 0
        self.active_question = None
        self.active_spell = None
        self.turn_id = None
        self.last_turn = 0.0
        self.cooldowns: dict[str, float] = {}
        self.log = ["Welcome, alchemist. Choose a spell to begin."]
        self.completed: set[str] = set()
        self.rewards: list[str] = []

    def current_boss(self):
        return CHAPTERS[self.chapter - 1]["bosses"][self.boss_index]

    def state(self):
        boss = self.current_boss()
        if not self.boss_hp: self.boss_hp = boss[2]
        question = None
        if self.active_question:
            question = {"prompt": self.active_question[0], "choices": self.active_question[1]}
        return {"session_id": self.id, "avatar": self.avatar.model_dump() if self.avatar else None, "finalized": self.finalized,
                "chapter": self.chapter, "chapter_name": CHAPTERS[self.chapter-1]["name"], "chapter_subtitle": CHAPTERS[self.chapter-1]["subtitle"],
                "chapter_color": CHAPTERS[self.chapter-1]["color"], "boss": {"id": boss[0], "name": boss[1], "max_hp": boss[2], "hp": self.boss_hp, "damage": boss[3], "kind": boss[4], "lore": boss[5]},
                "player": {"hp": self.player_hp, "max_hp": self.player_max_hp}, "question": question, "active_spell": self.active_spell,
                "cooldowns": {key: max(0, round(value - time.time(), 1)) for key, value in self.cooldowns.items()}, "log": self.log[-5:],
                "completed": list(self.completed), "rewards": self.rewards}

sessions: dict[str, Session] = {}
app = FastAPI(title="Organic Battles V2")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

def get_session(session_id: str | None) -> Session:
    if not session_id or session_id not in sessions: raise HTTPException(404, "Session not found")
    return sessions[session_id]

@app.get("/")
def index(): return FileResponse(ROOT / "templates" / "index.html")

@app.get("/favicon.ico")
def favicon(): return FileResponse(ROOT / "static" / "favicon.svg", media_type="image/svg+xml")

@app.post("/api/game/new")
def new_game():
    s = Session(); sessions[s.id] = s; return s.state()

@app.get("/api/game/state")
def game_state(session_id: str): return get_session(session_id).state()

@app.post("/api/avatar/finalize")
def finalize_avatar(session_id: str, avatar: Avatar):
    s = get_session(session_id)
    if s.finalized: raise HTTPException(409, "Avatar is permanent")
    s.avatar, s.finalized = avatar, True; s.log.append("Avatar accepted. Your ORGO journey begins."); return s.state()

@app.post("/api/battle/select-spell")
def select_spell(session_id: str, request: SpellRequest):
    s = get_session(session_id)
    if request.spell_id not in SPELLS: raise HTTPException(400, "Unknown spell")
    if not s.finalized: raise HTTPException(400, "Finalize your avatar first")
    if s.active_question: raise HTTPException(409, "Answer the active question")
    spell = SPELLS[request.spell_id]
    if s.cooldowns.get(request.spell_id, 0) > time.time(): raise HTTPException(409, "Spell is cooling down")
    s.active_spell, s.turn_id = request.spell_id, str(uuid.uuid4())
    q = random.choice(QUESTIONS); choices = q[1][:]; random.shuffle(choices); s.active_question = (q[0], choices, q[2])
    return {"turn_id": s.turn_id, **s.state()}

@app.post("/api/battle/answer")
def answer(session_id: str, request: AnswerRequest):
    s = get_session(session_id)
    if not s.active_question or not s.active_spell: raise HTTPException(409, "No active question")
    q, choices, correct = s.active_question; spell_id = s.active_spell; spell = SPELLS[spell_id]
    is_correct = request.answer == correct; damage = spell[2] if is_correct else 0
    s.boss_hp = max(0, s.boss_hp - damage); s.cooldowns[spell_id] = time.time() + spell[3]
    boss_hit = random.random() < 0.5; boss_damage = s.current_boss()[3] if boss_hit else 0
    s.player_hp = max(0, s.player_hp - boss_damage); s.log.append(("Correct! " + spell[0] + " deals " + str(damage) + " damage." if is_correct else "Fizzle. The correct answer was: " + correct))
    result = {"correct": is_correct, "question_prompt": q, "correct_answer": correct, "explanation": EXPLANATIONS.get(q, "Review the definition and compare each answer with the key chemistry idea in the question."), "damage": damage, "boss_hit": boss_hit, "boss_damage": boss_damage, "spell_id": spell_id}
    defeated = s.boss_hp <= 0; defeat = s.player_hp <= 0
    s.active_question = s.active_spell = s.turn_id = None
    if defeated:
        boss_id = s.current_boss()[0]; s.completed.add(boss_id); reward = {1:"Resonance Slayer",2:"Mechanism Master",3:"Spectral Champion"}[s.chapter] if s.boss_index == len(CHAPTERS[s.chapter-1]["bosses"])-1 else "Arcane Chemistry Shard"; s.rewards.append(reward); s.log.append(f"{s.current_boss()[1]} defeated! Reward unlocked: {reward}.")
    if defeat: s.log.append("Your aura fades. Retry when ready.")
    result.update({"defeated": defeated, "defeat": defeat, **s.state()}); return result

@app.post("/api/battle/retry")
def retry(session_id: str):
    s = get_session(session_id); s.player_hp = 150; s.boss_hp = s.current_boss()[2]; s.active_question = s.active_spell = None; s.log.append("Battle reset. Your completed progression remains safe."); return s.state()

@app.post("/api/battle/next-turn")
def next_turn(session_id: str):
    s = get_session(session_id)
    if s.current_boss()[0] not in s.completed: raise HTTPException(409, "Defeat the current boss first")
    if s.boss_index < len(CHAPTERS[s.chapter-1]["bosses"])-1: s.boss_index += 1
    elif s.chapter < 3: s.chapter += 1; s.boss_index = 0
    else: return {"victory": True, **s.state()}
    s.boss_hp = s.current_boss()[2]; s.player_hp = 150; s.log.append("New arena discovered: " + s.current_boss()[1]); return s.state()

@app.get("/api/progression")
def progression(session_id: str): return get_session(session_id).state()
