> ## ⚠ 부분 폐기 — 2026-08-30 통합 결정으로 갱신됨
>
> 이 계획은 **Python 신규 저장소**를 전제로 썼다. 그 전제가 뒤집혔다.
> Genspark(이 저장소)에 Playwright · ffmpeg · `renders` 잡 모델이 이미 구현돼 있어
> 인프라를 새로 지을 이유가 없다.
>
> - **폐기**: Task 01(ffmpeg 래퍼) · 잡 상태 모델 · 다운로드 흐름 · Python/Pillow 스택
> - **생존**: 프리셋 6종 프롬프트 · 로고 오염도 스캔 · 엔드프레임 생성 · QA 지표 ·
>   Seedance 어댑터 계약 — 전부 **TypeScript 로 이식**한다
> - **뒤집힘**: 알파를 P4 로 미룬 결정. 이 앱의 Canvas 렌더러가 진짜 알파를 뽑는다
>
> 정본은 `docs/superpowers/specs/2026-08-30-logo-studio-unification-design.md`.
> 이 파일은 **프리셋 프롬프트와 ffmpeg 파라미터의 참조용**으로만 읽는다.

---

# Logo Sting Studio — P1a 코어 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브랜드 로고 PNG 한 장에서 로고 스팅 영상을 생성하고 서버에서 자동 마무리해 납품 세트를 뱉는 CLI 파이프라인을 만든다.

**Architecture:** 5개 모듈(`logo_prep` → `generator` → `post` → `qa` → `packager`)을 선형으로 연결한다. 생성 원본은 불변으로 보관하고 마무리는 몇 번이든 재실행 가능하다. `generator`만 인터페이스로 분리해 모델 교체에 대비하고, 나머지는 추상화하지 않는다.

**Tech Stack:** Python 3.12, Pillow, ffmpeg/ffprobe (외부 바이너리), pytest, httpx (Higgsfield 호출)

**Spec:** `docs/superpowers/specs/2026-08-30-logo-sting-studio-design.md`

## Global Constraints

- Python 3.12 이상
- ffmpeg / ffprobe 가 PATH 에 있어야 한다. 없으면 즉시 명확한 에러로 중단한다
- 출력 길이는 **5.0초 고정**, 기본 fps는 **24**
- 목표 라우드니스: VFX 계열 **−16 LUFS**, 자연 계열 **−20 LUFS**
- 로고 소스 최소 가로 **800px**. 미만이면 배치 폭 비율을 자동으로 낮춘다
- 로고 소스 브랜드 외 색조 비율 **2% 미만**, 불투명 픽셀 비율 **60% 이상**
- **크레딧을 쓰는 호출(생성·업스케일)은 절대 자동 재시도하지 않는다**
- 모든 코드 주석과 로그 메시지는 한국어로 쓴다
- 새 저장소 `logo-sting-studio` 의 루트를 기준으로 한 경로다. 기본 브랜치는 `main`

---

## File Structure

```
logo-sting-studio/
├── pyproject.toml
├── README.md
├── logo_sting/
│   ├── __init__.py
│   ├── errors.py          # 예외 타입
│   ├── ffmpeg_util.py     # ffmpeg/ffprobe 호출 래퍼
│   ├── models.py          # 데이터 클래스
│   ├── presets.py         # 프리셋 정의
│   ├── logo_prep.py       # 로고 검증 + 엔드프레임 생성
│   ├── generator.py       # Higgsfield 어댑터
│   ├── post.py            # ffmpeg 마무리 체인
│   ├── qa.py              # 자동 지표 + 콘택트 시트
│   ├── packager.py        # 납품 세트 조립
│   └── cli.py             # CLI 엔트리
└── tests/
    ├── conftest.py
    ├── fixtures/          # 세션 산출물 픽스처
    ├── test_ffmpeg_util.py
    ├── test_logo_prep.py
    ├── test_presets.py
    ├── test_post.py
    ├── test_qa.py
    ├── test_packager.py
    └── test_generator.py
```

책임 분리 원칙: `post`/`qa` 는 ffmpeg 를 직접 부르지 않고 `ffmpeg_util` 을 거친다.
이렇게 해야 ffmpeg 호출 방식을 바꿀 때 한 파일만 고친다.

---

### Task 1: 프로젝트 스캐폴딩과 ffmpeg 래퍼

**Files:**
- Create: `pyproject.toml`
- Create: `logo_sting/__init__.py`
- Create: `logo_sting/errors.py`
- Create: `logo_sting/ffmpeg_util.py`
- Create: `tests/conftest.py`
- Test: `tests/test_ffmpeg_util.py`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces:
  - `class ToolMissingError(RuntimeError)`, `class FFmpegError(RuntimeError)`, `class ValidationError(ValueError)`
  - `require_tools() -> None`
  - `probe(path: Path) -> dict`
  - `video_info(path: Path) -> VideoInfo` — `VideoInfo(width:int, height:int, fps:float, duration:float, has_audio:bool)`
  - `run_ffmpeg(args: list[str]) -> None`

- [ ] **Step 1: 프로젝트 파일 생성**

`pyproject.toml`:

```toml
[project]
name = "logo-sting-studio"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["pillow>=10.0", "httpx>=0.27"]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[project.scripts]
logo-sting = "logo_sting.cli:main"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

`logo_sting/__init__.py`: 빈 파일.

`logo_sting/errors.py`:

```python
"""파이프라인 전역 예외 타입."""


class ToolMissingError(RuntimeError):
    """ffmpeg/ffprobe 등 외부 도구가 없을 때."""


class FFmpegError(RuntimeError):
    """ffmpeg 실행이 실패했을 때. 표준에러 원문을 담는다."""


class ValidationError(ValueError):
    """입력이 파이프라인 요구사항을 만족하지 못할 때."""
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/conftest.py`:

```python
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES
```

`tests/test_ffmpeg_util.py`:

```python
import subprocess

import pytest

from logo_sting.errors import FFmpegError
from logo_sting import ffmpeg_util


def make_clip(path, seconds=2, fps=24, with_audio=True):
    """테스트용 합성 클립을 만든다."""
    args = ["-y", "-f", "lavfi", "-i", f"color=c=black:s=320x180:r={fps}:d={seconds}"]
    if with_audio:
        args += ["-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}"]
    args += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if with_audio:
        args += ["-c:a", "aac", "-shortest"]
    args += [str(path)]
    ffmpeg_util.run_ffmpeg(args)


def test_video_info_reads_dimensions_fps_and_audio(tmp_path):
    clip = tmp_path / "clip.mp4"
    make_clip(clip, seconds=2, fps=24, with_audio=True)

    info = ffmpeg_util.video_info(clip)

    assert info.width == 320
    assert info.height == 180
    assert info.fps == pytest.approx(24.0, abs=0.01)
    assert info.duration == pytest.approx(2.0, abs=0.15)
    assert info.has_audio is True


def test_video_info_detects_missing_audio(tmp_path):
    clip = tmp_path / "silent.mp4"
    make_clip(clip, with_audio=False)

    assert ffmpeg_util.video_info(clip).has_audio is False


def test_run_ffmpeg_raises_with_stderr_on_failure(tmp_path):
    with pytest.raises(FFmpegError) as exc:
        ffmpeg_util.run_ffmpeg(["-i", str(tmp_path / "없는파일.mp4"), "-f", "null", "-"])

    assert "없는파일" in str(exc.value) or "No such file" in str(exc.value)
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pytest tests/test_ffmpeg_util.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.ffmpeg_util'`

- [ ] **Step 4: 구현**

`logo_sting/ffmpeg_util.py`:

```python
"""ffmpeg / ffprobe 호출을 한곳에 모은다.

post·qa 는 서브프로세스를 직접 부르지 않고 반드시 이 모듈을 거친다.
호출 방식을 바꿀 때 고칠 파일이 하나가 되도록.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .errors import FFmpegError, ToolMissingError


@dataclass(frozen=True)
class VideoInfo:
    width: int
    height: int
    fps: float
    duration: float
    has_audio: bool


def require_tools() -> None:
    """ffmpeg/ffprobe 존재를 확인한다. 없으면 즉시 중단."""
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise ToolMissingError(
                f"{tool} 를 PATH 에서 찾을 수 없습니다. ffmpeg 를 설치하고 PATH 에 추가하세요."
            )


def run_ffmpeg(args: list[str]) -> None:
    """ffmpeg 를 실행한다. 실패하면 표준에러 원문을 담아 예외를 던진다."""
    require_tools()
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise FFmpegError(f"ffmpeg 실행 실패 (코드 {proc.returncode}):\n{proc.stderr.strip()}")


def probe(path: Path) -> dict:
    """ffprobe 결과를 dict 로 반환한다."""
    require_tools()
    proc = subprocess.run(
        [
            "ffprobe", "-v", "error", "-print_format", "json",
            "-show_streams", "-show_format", str(path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise FFmpegError(f"ffprobe 실행 실패: {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def _parse_fraction(value: str) -> float:
    num, _, den = value.partition("/")
    den_value = float(den) if den else 1.0
    return float(num) / den_value if den_value else 0.0


def video_info(path: Path) -> VideoInfo:
    """영상의 크기·fps·길이·오디오 유무를 읽는다."""
    data = probe(path)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        raise FFmpegError(f"영상 스트림이 없습니다: {path}")

    return VideoInfo(
        width=int(video["width"]),
        height=int(video["height"]),
        fps=_parse_fraction(video.get("r_frame_rate", "0/1")),
        duration=float(data.get("format", {}).get("duration", 0.0)),
        has_audio=any(s.get("codec_type") == "audio" for s in streams),
    )
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pytest tests/test_ffmpeg_util.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6: 커밋**

```bash
git add pyproject.toml logo_sting/ tests/
git commit -m "feat: 프로젝트 스캐폴딩과 ffmpeg 호출 래퍼"
```

---

### Task 2: 데이터 모델과 프리셋 정의

**Files:**
- Create: `logo_sting/models.py`
- Create: `logo_sting/presets.py`
- Test: `tests/test_presets.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `models.LogoScan(width:int, height:int, has_alpha:bool, off_brand_ratio:float, solid_ratio:float, ok:bool, problems:list[str])`
  - `models.RenderSpec(preset_key:str, aspect:str, brand_name:str, logo_path:Path, brand_rgb:tuple[int,int,int])`
  - `models.QAReport(landing_ssim:float, output_lufs:float, gain_applied_db:float, warnings:list[str], passed:bool)`
  - `presets.Preset(key, family, background_rgb, dissolve_seconds, target_lufs, prompt_body, sound_line)`
  - `presets.PRESETS: dict[str, Preset]`
  - `presets.ASPECTS: dict[str, tuple[tuple[int,int], float]]` — 비율명 → ((가로,세로), 로고 폭 비율)
  - `presets.build_prompt(preset, brand_name, color, accent) -> str`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_presets.py`:

```python
import pytest

from logo_sting import presets


def test_all_presets_have_required_fields():
    assert set(presets.PRESETS) == {"forge", "shard", "arc", "dew", "growth", "mist"}
    for key, preset in presets.PRESETS.items():
        assert preset.key == key
        assert preset.family in ("vfx", "nature")
        assert len(preset.background_rgb) == 3
        assert 0.2 <= preset.dissolve_seconds <= 1.0
        assert preset.prompt_body.strip()
        assert preset.sound_line.strip()


def test_vfx_and_nature_have_different_loudness_targets():
    assert presets.PRESETS["forge"].target_lufs == -16.0
    assert presets.PRESETS["dew"].target_lufs == -20.0


def test_dynamic_background_presets_dissolve_longer():
    """잔불이 움직이는 FORGE 는 정적 배경보다 디졸브가 길어야 점프가 안 보인다."""
    assert presets.PRESETS["forge"].dissolve_seconds > presets.PRESETS["mist"].dissolve_seconds


def test_build_prompt_substitutes_and_keeps_negatives():
    prompt = presets.build_prompt(
        presets.PRESETS["forge"], brand_name="PLAZION", color="violet", accent="deep purple"
    )
    assert "PLAZION" in prompt
    assert "violet" in prompt
    assert "no music, no voice" in prompt


def test_nature_prompts_forbid_fire():
    """자연 계열은 부정 지시가 없으면 모델이 불꽃을 넣는다."""
    for key in ("dew", "growth", "mist"):
        prompt = presets.build_prompt(
            presets.PRESETS[key], brand_name="GreenB", color="fresh green", accent="emerald"
        )
        assert "no fire" in prompt
        assert "no flames" in prompt


def test_aspects_reserve_margin_around_logo():
    """로고가 꽉 차면 결과물에서 잘린다. 폭 비율은 90% 미만이어야 한다."""
    assert set(presets.ASPECTS) == {"16:9", "9:16", "1:1"}
    for (canvas, width_frac) in presets.ASPECTS.values():
        assert len(canvas) == 2
        assert 0.3 < width_frac < 0.9
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_presets.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.presets'`

- [ ] **Step 3: 구현**

`logo_sting/models.py`:

```python
"""파이프라인이 주고받는 데이터 구조."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class LogoScan:
    """로고 소스 검증 결과."""

    width: int
    height: int
    has_alpha: bool
    off_brand_ratio: float   # 브랜드 색조에서 벗어난 픽셀 비율
    solid_ratio: float       # 불투명 픽셀 비율 (낮으면 하프톤/디졸브 중)
    ok: bool
    problems: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RenderSpec:
    """한 편(비율 1개)을 만들기 위한 입력."""

    preset_key: str
    aspect: str
    brand_name: str
    logo_path: Path
    brand_rgb: tuple[int, int, int]


@dataclass(frozen=True)
class QAReport:
    """마무리본 자동 품질 지표."""

    landing_ssim: float
    output_lufs: float
    gain_applied_db: float
    warnings: list[str] = field(default_factory=list)
    passed: bool = True
```

`logo_sting/presets.py`:

```python
"""검증된 프리셋 정의.

2026-08-30 세션에서 PLAZION·GreenB 로 실제 생성해 확인한 것만 넣는다.
프롬프트의 부정 지시(no fire, no music...)는 장식이 아니다 —
모델 기본값이 '화려한 VFX + 음악'이라 명시적으로 막지 않으면 들어온다.
"""

from __future__ import annotations

from dataclasses import dataclass

# 비율명 → ((캔버스 가로, 세로), 로고 폭 비율)
# 폭 비율에 여백을 두는 이유: 레퍼런스 프레임의 프레이밍이 그대로 복사되므로
# 로고가 꽉 차면 결과물에서 잘려 나온다.
ASPECTS: dict[str, tuple[tuple[int, int], float]] = {
    "16:9": ((1920, 1080), 0.62),
    "9:16": ((1080, 1920), 0.78),
    "1:1": ((1080, 1080), 0.72),
}

_COMMON_TAIL = (
    "Locked static camera, centered composition, generous empty space around the logo. "
    "{sound} Sound effects only, no music, no voice, no narration."
)

_NATURE_NEGATIVES = (
    "Absolutely no fire, no flames, no smoke, no molten metal, no explosion, "
    "no sparks, no neon, no lightning. "
)


@dataclass(frozen=True)
class Preset:
    key: str
    family: str                      # "vfx" | "nature"
    background_rgb: tuple[int, int, int]
    dissolve_seconds: float          # 착지 교체 크로스페이드 길이
    target_lufs: float               # 목표 라우드니스
    prompt_body: str                 # {brand}/{color}/{accent} 치환
    sound_line: str


PRESETS: dict[str, Preset] = {
    "forge": Preset(
        key="forge",
        family="vfx",
        background_rgb=(4, 4, 6),
        dissolve_seconds=0.6,        # 잔불이 움직여서 길게 잡는다
        target_lufs=-16.0,
        prompt_body=(
            "Cinematic logo ending sting. In a deep black void, molten liquid chrome and "
            "{color} plasma energy churn and streak inward, then rapidly forge themselves "
            "INTO the {brand} wordmark: each letter solidifies out of flowing molten metal, "
            "cooling from white-hot to {color}; the central mark slams into place with a "
            "{color} flame shockwave erupting along its edge; {color} fire licks upward as "
            "the finished logo settles perfectly crisp, sharp and motionless. Deep black "
            "background, volumetric light, anamorphic lens flares, photoreal metal "
            "reflections, ember particles, heat shimmer, subtle film grain, high dynamic "
            "range. {color}, {accent} and polished chrome palette. "
        ),
        sound_line=(
            "Sound: a deep rising whoosh building tension, a heavy metallic impact clang "
            "with long reverb, crackling plasma fire, and a low cinematic sub-bass boom "
            "on the final lock."
        ),
    ),
    "shard": Preset(
        key="shard",
        family="vfx",
        background_rgb=(4, 4, 6),
        dissolve_seconds=0.5,
        target_lufs=-16.0,
        prompt_body=(
            "Cinematic logo ending sting, shattered-glass assembly. Out of a deep black "
            "void, hundreds of razor-sharp shards of {color} crystal and polished chrome "
            "hurtle inward through the darkness in slow motion, each catching a glint of "
            "light, and snap together piece by piece to assemble the {brand} wordmark; the "
            "final shard locks in with a burst of {color} sparks and a ring of {color} "
            "flame, then everything stills into the perfectly crisp finished logo. Deep "
            "black background, volumetric light shafts, anamorphic lens flares, photoreal "
            "glass refraction and metal reflections, drifting dust motes, subtle film "
            "grain, high dynamic range. {color}, {accent} and polished chrome palette. "
        ),
        sound_line=(
            "Sound: rushing air, layered crystalline glass chimes and shard impacts, a "
            "sharp metallic lock, and a low cinematic sub-bass boom."
        ),
    ),
    "arc": Preset(
        key="arc",
        family="vfx",
        background_rgb=(10, 4, 24),
        dissolve_seconds=0.5,
        target_lufs=-16.0,
        prompt_body=(
            "Cinematic logo ending sting, electrical condensation. In a dark void a violent "
            "storm of vivid {color} electrical arcs and glowing plasma particles swirls and "
            "crackles, brilliant white-hot lightning bolts branching and forking through "
            "drifting nebula haze and floating sparks; the particles suddenly rush together "
            "and condense, crystallizing letter by letter into the {brand} wordmark as arcs "
            "of {color} lightning whip across the metal surfaces; the central mark ignites "
            "white-hot then cools to brushed steel, and the finished logo holds perfectly "
            "crisp and still. Deep dark background, volumetric glow, anamorphic lens flares, "
            "photoreal metal reflections, electrical sparks, drifting particles, subtle film "
            "grain, high dynamic range. {color}, {accent} and polished chrome palette. "
        ),
        sound_line=(
            "Sound: crackling high-voltage electricity, a rising energy charge-up, a sharp "
            "thunder crack on the condensation, and a low cinematic sub-bass boom."
        ),
    ),
    "dew": Preset(
        key="dew",
        family="nature",
        background_rgb=(248, 250, 246),
        dissolve_seconds=0.3,
        target_lufs=-20.0,
        prompt_body=(
            "Serene, clean, minimal brand logo ending on a soft off-white background. "
            "Crystal-clear droplets of pure water and gentle ripples drift and converge "
            "through bright airy space, catching soft morning light and refracting it, then "
            "flow together and settle to form the {brand} wordmark, the letters emerging "
            "from clear water with a soft mirror reflection as the surface stills into "
            "perfect calm. Bright, clean, minimal, airy, restrained and premium. Soft "
            "natural daylight, gentle shallow depth of field, delicate water caustics, a "
            "few floating dust motes in a sunbeam. Off-white background with {color}. "
            + _NATURE_NEGATIVES
        ),
        sound_line=(
            "Sound: soft individual water droplets, a gentle trickle of a clean stream, "
            "quiet calm ambient air."
        ),
    ),
    "growth": Preset(
        key="growth",
        family="nature",
        background_rgb=(248, 250, 246),
        dissolve_seconds=0.3,
        target_lufs=-20.0,
        prompt_body=(
            "Serene, clean, minimal brand logo ending on a soft off-white background. Fresh "
            "green leaves, tender young shoots and delicate vines grow and unfurl in "
            "graceful natural time-lapse across bright airy space, curling and interlocking "
            "as they trace out and compose the {brand} wordmark, then the foliage settles "
            "gently into stillness. Bright, clean, minimal, botanical, restrained and "
            "premium. Soft natural daylight, shallow depth of field, subtle leaf "
            "translucency and soft shadows, a few seeds and pollen drifting in sunlight. "
            "Off-white background with {color}. " + _NATURE_NEGATIVES
        ),
        sound_line=(
            "Sound: soft rustling leaves, a light breeze, distant birdsong, quiet organic "
            "growth."
        ),
    ),
    "mist": Preset(
        key="mist",
        family="nature",
        background_rgb=(10, 38, 26),
        dissolve_seconds=0.3,
        target_lufs=-20.0,
        prompt_body=(
            "Calm, clean, cinematic brand logo ending in a deep forest green space. Soft "
            "morning mist drifts slowly while gentle shafts of sunlight filter down as if "
            "through a forest canopy, illuminating floating pollen and dust motes; the mist "
            "slowly parts and clears away, revealing the {brand} wordmark emerging cleanly "
            "out of the haze, and everything settles into complete stillness. Calm, refined, "
            "restrained, premium and quiet. Volumetric light shafts, soft focus falloff, "
            "gentle atmospheric haze, deep forest green palette with {color}. "
            + _NATURE_NEGATIVES
        ),
        sound_line=(
            "Sound: soft wind through leaves, distant birdsong, quiet forest ambience."
        ),
    ),
}


def build_prompt(preset: Preset, brand_name: str, color: str, accent: str) -> str:
    """프리셋 템플릿에 브랜드·색을 채워 최종 프롬프트를 만든다."""
    body = preset.prompt_body.format(brand=brand_name, color=color, accent=accent)
    return body + _COMMON_TAIL.format(sound=preset.sound_line)
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_presets.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/models.py logo_sting/presets.py tests/test_presets.py
git commit -m "feat: 데이터 모델과 검증된 프리셋 6종 정의"
```

---

### Task 3: 로고 소스 검증

**Files:**
- Create: `logo_sting/logo_prep.py`
- Test: `tests/test_logo_prep.py`

**Interfaces:**
- Consumes: `models.LogoScan`, `errors.ValidationError`
- Produces: `logo_prep.scan_logo(path: Path, brand_rgb: tuple[int,int,int]) -> LogoScan`

이 검증이 실제로 잡아야 하는 문제: 2026-08-30 세션에서 애니메이션 시퀀스
마지막 프레임을 로고 소스로 썼다가 **브랜드에 없는 보라색 글로우가 39.6%**
섞인 것을 한참 못 봤다. 또 그 시퀀스는 하프톤 디졸브로 렌더돼 어느 프레임을
뽑아도 로고가 격자였다(불투명 비율 57%).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_logo_prep.py`:

```python
from pathlib import Path

import pytest
from PIL import Image

from logo_sting import logo_prep

GREEN = (154, 205, 50)


def write_logo(path: Path, size=(1200, 300), fill=GREEN, alpha=255,
               contaminate_ratio=0.0, contaminant=(140, 60, 220)):
    """테스트용 로고를 만든다. contaminate_ratio 만큼 다른 색조를 섞는다."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    total = size[0] * size[1]
    bad = int(total * contaminate_ratio)
    n = 0
    for y in range(size[1]):
        for x in range(size[0]):
            if n < bad:
                px[x, y] = (*contaminant, alpha)
            else:
                px[x, y] = (*fill, alpha)
            n += 1
    img.save(path)
    return path


def test_clean_logo_passes(tmp_path):
    path = write_logo(tmp_path / "clean.png")

    scan = logo_prep.scan_logo(path, brand_rgb=GREEN)

    assert scan.ok is True
    assert scan.problems == []
    assert scan.has_alpha is True
    assert scan.width == 1200
    assert scan.off_brand_ratio < 0.02
    assert scan.solid_ratio > 0.6


def test_contaminated_logo_is_rejected(tmp_path):
    """세션에서 실제로 놓쳤던 보라 헤일로 39.6% 케이스."""
    path = write_logo(tmp_path / "dirty.png", contaminate_ratio=0.396)

    scan = logo_prep.scan_logo(path, brand_rgb=GREEN)

    assert scan.ok is False
    assert scan.off_brand_ratio == pytest.approx(0.396, abs=0.02)
    assert any("색조" in p for p in scan.problems)


def test_halftone_source_is_rejected(tmp_path):
    """불투명 비율이 낮으면 디졸브 중인 프레임이다."""
    img = Image.new("RGBA", (1200, 300), (0, 0, 0, 0))
    px = img.load()
    for y in range(300):
        for x in range(1200):
            # 체커보드로 절반만 불투명하게 → 하프톤 재현
            px[x, y] = (*GREEN, 255 if (x + y) % 2 == 0 else 0)
    path = tmp_path / "halftone.png"
    img.save(path)

    scan = logo_prep.scan_logo(path, brand_rgb=GREEN)

    assert scan.ok is False
    assert scan.solid_ratio < 0.6
    assert any("하프톤" in p or "디졸브" in p for p in scan.problems)


def test_low_resolution_is_reported_but_not_fatal(tmp_path):
    """작아도 폭 비율을 낮추면 쓸 수 있으므로 경고로만 남긴다."""
    path = write_logo(tmp_path / "small.png", size=(349, 82))

    scan = logo_prep.scan_logo(path, brand_rgb=GREEN)

    assert scan.width == 349
    assert any("해상도" in p for p in scan.problems)


def test_logo_without_alpha_is_rejected(tmp_path):
    path = tmp_path / "opaque.png"
    Image.new("RGB", (1200, 300), GREEN).save(path)

    scan = logo_prep.scan_logo(path, brand_rgb=GREEN)

    assert scan.has_alpha is False
    assert scan.ok is False
    assert any("알파" in p for p in scan.problems)
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_logo_prep.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.logo_prep'`

- [ ] **Step 3: 구현**

`logo_sting/logo_prep.py`:

```python
"""로고 소스 검증과 엔드프레임 생성.

엔드프레임은 AI 에게 '여기로 착지하라'고 주는 목표 지점이다.
픽셀 그대로 출력되지는 않지만, 색과 형태가 정확해야 결과가 브랜드에 맞는다.
"""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image

from .models import LogoScan

MIN_WIDTH = 800
MAX_OFF_BRAND_RATIO = 0.02
MIN_SOLID_RATIO = 0.60

_HUE_TOLERANCE = 0.08   # 색상환에서 브랜드 색조로부터 허용 거리 (0~0.5)
_SOLID_ALPHA = 250


def _hue(rgb: tuple[int, int, int]) -> float:
    r, g, b = (c / 255.0 for c in rgb)
    return colorsys.rgb_to_hsv(r, g, b)[0]


def _hue_distance(a: float, b: float) -> float:
    """색상환은 순환하므로 짧은 쪽 거리를 쓴다."""
    d = abs(a - b)
    return min(d, 1.0 - d)


def scan_logo(path: Path, brand_rgb: tuple[int, int, int]) -> LogoScan:
    """로고를 검증한다. 통과 여부와 문제 목록을 돌려준다."""
    img = Image.open(path)
    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
    img = img.convert("RGBA")

    bbox = img.split()[3].getbbox()
    if bbox is None:
        return LogoScan(
            width=0, height=0, has_alpha=has_alpha,
            off_brand_ratio=0.0, solid_ratio=0.0, ok=False,
            problems=["알파 채널이 비어 있습니다 — 투명 배경 로고가 맞는지 확인하세요."],
        )

    logo = img.crop(bbox)
    px = logo.load()
    brand_hue = _hue(brand_rgb)

    visible = solid = off_brand = 0
    # 큰 이미지에서도 빠르게 끝나도록 2픽셀 간격으로 표본을 뜬다
    for y in range(0, logo.height, 2):
        for x in range(0, logo.width, 2):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            visible += 1
            if a >= _SOLID_ALPHA:
                solid += 1
            # 무채색(회색·흰색·검정)은 색조 판정에서 제외한다
            if max(r, g, b) - min(r, g, b) > 20:
                if _hue_distance(_hue((r, g, b)), brand_hue) > _HUE_TOLERANCE:
                    off_brand += 1

    off_brand_ratio = off_brand / visible if visible else 0.0
    solid_ratio = solid / visible if visible else 0.0

    problems: list[str] = []
    if not has_alpha:
        problems.append("알파 채널이 없습니다 — 배경이 딸려 들어갑니다.")
    if off_brand_ratio >= MAX_OFF_BRAND_RATIO:
        problems.append(
            f"브랜드 외 색조가 {off_brand_ratio:.1%} 섞여 있습니다 "
            f"(허용 {MAX_OFF_BRAND_RATIO:.0%} 미만). 글로우·링 잔광이 알파에 남았을 수 있습니다."
        )
    if solid_ratio < MIN_SOLID_RATIO:
        problems.append(
            f"불투명 픽셀이 {solid_ratio:.1%} 뿐입니다 — 하프톤 또는 디졸브 중인 프레임입니다."
        )
    if logo.width < MIN_WIDTH:
        problems.append(
            f"해상도가 낮습니다 (가로 {logo.width}px, 권장 {MIN_WIDTH}px 이상). "
            "배치 폭 비율을 자동으로 낮춥니다."
        )

    # 해상도 문제만 있으면 통과시킨다 — 폭을 줄이면 쓸 수 있다
    fatal = [p for p in problems if not p.startswith("해상도")]

    return LogoScan(
        width=logo.width,
        height=logo.height,
        has_alpha=has_alpha,
        off_brand_ratio=off_brand_ratio,
        solid_ratio=solid_ratio,
        ok=not fatal,
        problems=problems,
    )
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_logo_prep.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/logo_prep.py tests/test_logo_prep.py
git commit -m "feat: 로고 소스 검증 — 색조 오염·하프톤·해상도·알파"
```

---

### Task 4: 엔드프레임 생성

**Files:**
- Modify: `logo_sting/logo_prep.py` (함수 추가)
- Modify: `tests/test_logo_prep.py` (테스트 추가)

**Interfaces:**
- Consumes: `presets.ASPECTS`, `presets.Preset`, Task 3 의 `scan_logo`
- Produces: `logo_prep.build_end_frame(logo_path: Path, out_path: Path, aspect: str, background_rgb: tuple[int,int,int]) -> Path`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_logo_prep.py` 끝에 추가:

```python
from logo_sting import presets


def test_end_frame_matches_canvas_and_centers_logo(tmp_path):
    logo = write_logo(tmp_path / "logo.png", size=(1200, 300))
    out = tmp_path / "end_16x9.png"

    logo_prep.build_end_frame(logo, out, aspect="16:9", background_rgb=(4, 4, 6))

    img = Image.open(out)
    assert img.size == (1920, 1080)
    assert img.mode == "RGB"          # 엔드프레임은 알파 없이 평탄화
    # 네 귀퉁이는 배경색이어야 한다 (로고가 여백 안에 들어갔다는 뜻)
    px = img.load()
    for corner in [(0, 0), (1919, 0), (0, 1079), (1919, 1079)]:
        assert px[corner] == (4, 4, 6)


def test_end_frame_leaves_margin(tmp_path):
    """레퍼런스 프레이밍이 복사되므로 로고가 꽉 차면 안 된다."""
    logo = write_logo(tmp_path / "logo.png", size=(1200, 300))
    out = tmp_path / "end.png"

    logo_prep.build_end_frame(logo, out, aspect="16:9", background_rgb=(4, 4, 6))

    canvas_w, _ = presets.ASPECTS["16:9"][0]
    expected_w = int(canvas_w * presets.ASPECTS["16:9"][1])
    assert expected_w < canvas_w * 0.9


def test_low_resolution_logo_gets_reduced_width(tmp_path):
    """349px 로고를 62% 로 키우면 뭉개진다. 폭을 낮춰 배치한다."""
    small = write_logo(tmp_path / "small.png", size=(349, 82))
    big = write_logo(tmp_path / "big.png", size=(1200, 300))
    out_small = tmp_path / "s.png"
    out_big = tmp_path / "b.png"

    logo_prep.build_end_frame(small, out_small, "16:9", (4, 4, 6))
    logo_prep.build_end_frame(big, out_big, "16:9", (4, 4, 6))

    def logo_width(path):
        img = Image.open(path).convert("RGB")
        px = img.load()
        cols = [x for x in range(img.width) if px[x, img.height // 2] != (4, 4, 6)]
        return max(cols) - min(cols) if cols else 0

    assert logo_width(out_small) < logo_width(out_big)


def test_vertical_aspect_produces_portrait_canvas(tmp_path):
    logo = write_logo(tmp_path / "logo.png")
    out = tmp_path / "end_9x16.png"

    logo_prep.build_end_frame(logo, out, aspect="9:16", background_rgb=(248, 250, 246))

    assert Image.open(out).size == (1080, 1920)
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_logo_prep.py -v -k end_frame or low_resolution_logo or vertical_aspect`
Expected: FAIL — `AttributeError: module 'logo_sting.logo_prep' has no attribute 'build_end_frame'`

- [ ] **Step 3: 구현**

`logo_sting/logo_prep.py` 에 추가 (파일 상단 import 에 `from .presets import ASPECTS` 추가):

```python
LOW_RES_WIDTH_FACTOR = 0.72   # 저해상도 로고는 기본 폭 비율의 72% 로 줄여 배치


def build_end_frame(
    logo_path: Path,
    out_path: Path,
    aspect: str,
    background_rgb: tuple[int, int, int],
) -> Path:
    """AI 에게 줄 착지 목표 프레임을 만든다.

    여백이 중요하다 — Seedance 는 레퍼런스 프레임의 프레이밍을 그대로 복사하므로
    로고가 꽉 차면 결과물에서 잘려 나온다.
    """
    if aspect not in ASPECTS:
        raise ValueError(f"알 수 없는 비율입니다: {aspect} (가능: {', '.join(ASPECTS)})")

    (canvas_w, canvas_h), width_frac = ASPECTS[aspect]

    img = Image.open(logo_path).convert("RGBA")
    bbox = img.split()[3].getbbox()
    if bbox is None:
        raise ValueError("알파 채널이 비어 있어 엔드프레임을 만들 수 없습니다.")
    logo = img.crop(bbox)

    # 저해상도 소스는 크게 키우면 뭉개진다. 작게 배치해 여백으로 처리한다.
    if logo.width < MIN_WIDTH:
        width_frac *= LOW_RES_WIDTH_FACTOR

    target_w = int(canvas_w * width_frac)
    target_h = max(1, round(logo.height * target_w / logo.width))

    # 세로가 넘치면 높이 기준으로 다시 맞춘다
    if target_h > canvas_h * 0.80:
        target_h = int(canvas_h * 0.80)
        target_w = max(1, round(logo.width * target_h / logo.height))

    resized = logo.resize((target_w, target_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (*background_rgb, 255))
    canvas.alpha_composite(resized, ((canvas_w - target_w) // 2, (canvas_h - target_h) // 2))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path)
    return out_path
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_logo_prep.py -v`
Expected: PASS (9 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/logo_prep.py tests/test_logo_prep.py
git commit -m "feat: 비율별 엔드프레임 생성 (여백 확보·저해상도 자동 축소)"
```

---

### Task 5: 오디오 정규화

**Files:**
- Create: `logo_sting/post.py`
- Test: `tests/test_post.py`

**Interfaces:**
- Consumes: `ffmpeg_util.run_ffmpeg`, `ffmpeg_util.video_info`
- Produces:
  - `post.measure_lufs(path: Path) -> float`
  - `post.normalize_audio(src: Path, dst: Path, target_lufs: float) -> float` — 적용된 게인(dB)을 반환

−41dB 를 −16 LUFS 로 올리면 게인이 25dB 라 노이즈 플로어도 같이 올라온다.
그래서 게인 값을 반환해 QA 가 경고할 수 있게 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_post.py`:

```python
import pytest

from logo_sting import ffmpeg_util, post


def make_clip(path, seconds=5, fps=24, volume=1.0):
    """지정 볼륨의 사인파 오디오를 가진 클립을 만든다."""
    ffmpeg_util.run_ffmpeg([
        "-y",
        "-f", "lavfi", "-i", f"color=c=black:s=320x180:r={fps}:d={seconds}",
        "-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}",
        "-filter:a", f"volume={volume}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        str(path),
    ])


def test_measure_lufs_returns_negative_loudness(tmp_path):
    clip = tmp_path / "clip.mp4"
    make_clip(clip, volume=0.5)

    lufs = post.measure_lufs(clip)

    assert -70.0 < lufs < 0.0


def test_normalize_audio_brings_quiet_clip_up_to_target(tmp_path):
    """자연 계열 −41dB 케이스를 재현한다."""
    src = tmp_path / "quiet.mp4"
    dst = tmp_path / "normalized.mp4"
    make_clip(src, volume=0.01)

    gain = post.normalize_audio(src, dst, target_lufs=-20.0)

    assert dst.exists()
    assert post.measure_lufs(dst) == pytest.approx(-20.0, abs=1.5)
    assert gain > 10.0


def test_normalize_audio_reports_gain_in_db(tmp_path):
    src = tmp_path / "loud.mp4"
    dst = tmp_path / "out.mp4"
    make_clip(src, volume=1.0)

    gain = post.normalize_audio(src, dst, target_lufs=-16.0)

    assert isinstance(gain, float)


def test_normalize_audio_preserves_video_stream(tmp_path):
    src = tmp_path / "in.mp4"
    dst = tmp_path / "out.mp4"
    make_clip(src, seconds=5, fps=24)

    post.normalize_audio(src, dst, target_lufs=-16.0)

    info = ffmpeg_util.video_info(dst)
    assert info.width == 320
    assert info.has_audio is True
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_post.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.post'`

- [ ] **Step 3: 구현**

`logo_sting/post.py`:

```python
"""ffmpeg 마무리 체인.

생성 원본은 절대 덮어쓰지 않는다. 각 함수는 src 를 읽어 dst 에 새로 쓴다.
그래야 마무리를 몇 번이든 다시 돌려도 크레딧이 안 든다.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from .errors import FFmpegError
from . import ffmpeg_util

_LUFS_PATTERN = re.compile(r'"input_i"\s*:\s*"(-?[\d.]+)"')


def measure_lufs(path: Path) -> float:
    """loudnorm 1차 패스로 통합 라우드니스를 측정한다."""
    ffmpeg_util.require_tools()
    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
            "-map", "0:a", "-af", "loudnorm=print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    match = _LUFS_PATTERN.search(proc.stderr)
    if not match:
        raise FFmpegError(f"라우드니스를 측정하지 못했습니다:\n{proc.stderr[-2000:]}")
    return float(match.group(1))


def normalize_audio(src: Path, dst: Path, target_lufs: float) -> float:
    """오디오를 목표 라우드니스로 맞춘다. 적용된 게인(dB)을 돌려준다.

    게인이 크면 노이즈 플로어도 같이 올라오므로, 호출자가 경고할 수 있게
    실제 적용 게인을 반환한다. 리미터로 피크를 −1dBTP 에 묶는다.
    """
    before = measure_lufs(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_util.run_ffmpeg([
        "-y", "-i", str(src),
        "-c:v", "copy",
        "-af", f"loudnorm=I={target_lufs}:TP=-1.0:LRA=11",
        "-c:a", "aac", "-b:a", "192k",
        str(dst),
    ])
    return target_lufs - before
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_post.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/post.py tests/test_post.py
git commit -m "feat: 오디오 라우드니스 정규화 (게인 반환·리미터 포함)"
```

---

### Task 6: 길이·프레임레이트 정규화

**Files:**
- Modify: `logo_sting/post.py`
- Modify: `tests/test_post.py`

**Interfaces:**
- Consumes: Task 5 의 `post` 모듈, `ffmpeg_util.video_info`
- Produces: `post.normalize_timing(src: Path, dst: Path, duration: float = 5.0, fps: int = 24) -> None`

Seedance 는 5초를 요청해도 5.06초를 뱉고 fps 는 항상 24다. 타임라인에 얹으려면 정확해야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_post.py` 끝에 추가:

```python
def test_normalize_timing_trims_to_exact_duration(tmp_path):
    """5.06초 출력을 정확히 5.00초로 자른다."""
    src = tmp_path / "long.mp4"
    dst = tmp_path / "trimmed.mp4"
    make_clip(src, seconds=5.06)

    post.normalize_timing(src, dst, duration=5.0, fps=24)

    assert ffmpeg_util.video_info(dst).duration == pytest.approx(5.0, abs=0.06)


def test_normalize_timing_converts_fps(tmp_path):
    src = tmp_path / "24fps.mp4"
    dst = tmp_path / "30fps.mp4"
    make_clip(src, seconds=5, fps=24)

    post.normalize_timing(src, dst, duration=5.0, fps=30)

    assert ffmpeg_util.video_info(dst).fps == pytest.approx(30.0, abs=0.01)


def test_normalize_timing_keeps_audio(tmp_path):
    src = tmp_path / "in.mp4"
    dst = tmp_path / "out.mp4"
    make_clip(src, seconds=5)

    post.normalize_timing(src, dst)

    assert ffmpeg_util.video_info(dst).has_audio is True
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_post.py -v -k normalize_timing`
Expected: FAIL — `AttributeError: module 'logo_sting.post' has no attribute 'normalize_timing'`

- [ ] **Step 3: 구현**

`logo_sting/post.py` 에 추가:

```python
def normalize_timing(src: Path, dst: Path, duration: float = 5.0, fps: int = 24) -> None:
    """길이와 프레임레이트를 정확히 맞춘다.

    Seedance 는 5초를 요청해도 5.06초를 뱉고 fps 는 항상 24다.
    편집 타임라인에 얹으려면 정확해야 한다.
    """
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_util.run_ffmpeg([
        "-y", "-i", str(src),
        "-t", f"{duration:.3f}",
        "-r", str(fps),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
        "-c:a", "aac", "-b:a", "192k",
        str(dst),
    ])
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_post.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/post.py tests/test_post.py
git commit -m "feat: 길이 5초 고정·프레임레이트 정규화"
```

---

### Task 7: 착지 프레임 교체

**Files:**
- Modify: `logo_sting/post.py`
- Modify: `tests/test_post.py`

**Interfaces:**
- Consumes: Task 5·6 의 `post` 모듈, `ffmpeg_util.video_info`
- Produces: `post.replace_landing(src: Path, end_frame: Path, dst: Path, dissolve_seconds: float) -> None`

`end_image` 를 줘도 로고가 미세하게 이동·축소된다. 마지막 구간을 원본
엔드프레임으로 크로스페이드해 **착지를 픽셀 정확하게** 만든다.

디졸브 길이가 프리셋별로 다른 이유: 배경이 정적인 컨셉(안개·물)은 짧아도
티가 안 나지만, 잔불이 움직이는 FORGE 는 짧으면 점프가 보인다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_post.py` 끝에 추가:

```python
from PIL import Image, ImageChops


def make_end_frame(path, size=(320, 180), color=(20, 200, 40)):
    img = Image.new("RGB", size, (4, 4, 6))
    px = img.load()
    for y in range(size[1] // 3, size[1] * 2 // 3):
        for x in range(size[0] // 4, size[0] * 3 // 4):
            px[x, y] = color
    img.save(path)
    return path


def extract_frame(video, out_png, from_end=0.05):
    ffmpeg_util.run_ffmpeg([
        "-y", "-sseof", f"-{from_end}", "-i", str(video), "-frames:v", "1", str(out_png)
    ])
    return out_png


def test_replace_landing_makes_final_frame_match_end_frame(tmp_path):
    src = tmp_path / "src.mp4"
    dst = tmp_path / "dst.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(src, seconds=5)

    post.replace_landing(src, end, dst, dissolve_seconds=0.5)

    last = Image.open(extract_frame(dst, tmp_path / "last.png")).convert("RGB")
    ref = Image.open(end).convert("RGB")
    diff = ImageChops.difference(last, ref)
    # 인코딩 손실만 남아야 한다
    assert max(diff.convert("L").getextrema()) < 30


def test_replace_landing_preserves_duration(tmp_path):
    src = tmp_path / "src.mp4"
    dst = tmp_path / "dst.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(src, seconds=5)

    post.replace_landing(src, end, dst, dissolve_seconds=0.5)

    assert ffmpeg_util.video_info(dst).duration == pytest.approx(5.0, abs=0.15)


def test_replace_landing_preserves_audio(tmp_path):
    src = tmp_path / "src.mp4"
    dst = tmp_path / "dst.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(src, seconds=5)

    post.replace_landing(src, end, dst, dissolve_seconds=0.4)

    assert ffmpeg_util.video_info(dst).has_audio is True


def test_replace_landing_rejects_dissolve_longer_than_clip(tmp_path):
    src = tmp_path / "src.mp4"
    dst = tmp_path / "dst.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(src, seconds=2)

    with pytest.raises(ValueError, match="디졸브"):
        post.replace_landing(src, end, dst, dissolve_seconds=5.0)
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_post.py -v -k replace_landing`
Expected: FAIL — `AttributeError: module 'logo_sting.post' has no attribute 'replace_landing'`

- [ ] **Step 3: 구현**

`logo_sting/post.py` 에 추가:

```python
def replace_landing(
    src: Path,
    end_frame: Path,
    dst: Path,
    dissolve_seconds: float,
) -> None:
    """마지막 구간을 원본 엔드프레임으로 크로스페이드해 착지를 정확하게 만든다.

    end_image 를 줘도 AI 는 로고를 미세하게 옮기고 줄인다. 마지막을 원본으로
    덮어야 브랜드 로고가 픽셀 정확해진다.

    dissolve_seconds 는 프리셋마다 다르다 — 배경이 움직이는 컨셉은 길어야
    교체 지점의 점프가 안 보인다.
    """
    info = ffmpeg_util.video_info(src)
    if dissolve_seconds >= info.duration:
        raise ValueError(
            f"디졸브 길이({dissolve_seconds}s)가 영상 길이({info.duration:.2f}s)보다 깁니다."
        )

    start = info.duration - dissolve_seconds
    dst.parent.mkdir(parents=True, exist_ok=True)

    # 엔드프레임을 영상과 같은 크기·길이의 스틸 클립으로 만든 뒤 xfade 로 겹친다
    filter_complex = (
        f"[1:v]scale={info.width}:{info.height},format=yuv420p,"
        f"loop=loop=-1:size=1:start=0,trim=duration={dissolve_seconds},setpts=PTS-STARTPTS[still];"
        f"[0:v]format=yuv420p,setpts=PTS-STARTPTS[base];"
        f"[base][still]xfade=transition=fade:duration={dissolve_seconds}:offset={start:.3f}[v]"
    )

    ffmpeg_util.run_ffmpeg([
        "-y",
        "-i", str(src),
        "-loop", "1", "-t", f"{dissolve_seconds:.3f}", "-i", str(end_frame),
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
        "-c:a", "copy",
        str(dst),
    ])
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_post.py -v`
Expected: PASS (11 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/post.py tests/test_post.py
git commit -m "feat: 착지 프레임 교체 — 마지막 구간을 원본 로고로 크로스페이드"
```

---

### Task 8: 자동 품질 지표

**Files:**
- Create: `logo_sting/qa.py`
- Test: `tests/test_qa.py`

**Interfaces:**
- Consumes: `ffmpeg_util`, `post.measure_lufs`, `models.QAReport`
- Produces:
  - `qa.landing_ssim(video: Path, end_frame: Path) -> float`
  - `qa.evaluate(video: Path, end_frame: Path, target_lufs: float, gain_applied_db: float) -> QAReport`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_qa.py`:

```python
import pytest
from PIL import Image

from logo_sting import ffmpeg_util, post, qa


def make_clip_from_image(path, image_path, seconds=5):
    """정지 이미지로 클립을 만든다 — 착지가 완벽한 케이스."""
    ffmpeg_util.run_ffmpeg([
        "-y", "-loop", "1", "-t", str(seconds), "-i", str(image_path),
        "-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "24",
        "-c:a", "aac", "-shortest", str(path),
    ])


def make_frame(path, color, size=(320, 180)):
    Image.new("RGB", size, color).save(path)
    return path


def test_landing_ssim_is_near_one_when_frames_match(tmp_path):
    frame = make_frame(tmp_path / "end.png", (30, 160, 60))
    clip = tmp_path / "clip.mp4"
    make_clip_from_image(clip, frame)

    assert qa.landing_ssim(clip, frame) > 0.99


def test_landing_ssim_drops_when_frames_differ(tmp_path):
    end = make_frame(tmp_path / "end.png", (30, 160, 60))
    other = make_frame(tmp_path / "other.png", (200, 30, 30))
    clip = tmp_path / "clip.mp4"
    make_clip_from_image(clip, other)

    assert qa.landing_ssim(clip, end) < 0.99


def test_evaluate_passes_on_good_output(tmp_path):
    frame = make_frame(tmp_path / "end.png", (30, 160, 60))
    src = tmp_path / "src.mp4"
    dst = tmp_path / "dst.mp4"
    make_clip_from_image(src, frame)
    gain = post.normalize_audio(src, dst, target_lufs=-16.0)

    report = qa.evaluate(dst, frame, target_lufs=-16.0, gain_applied_db=gain)

    assert report.passed is True
    assert report.landing_ssim > 0.99
    assert report.output_lufs == pytest.approx(-16.0, abs=1.0)


def test_evaluate_warns_on_large_gain(tmp_path):
    """20dB 넘게 올리면 노이즈 플로어도 올라온다."""
    frame = make_frame(tmp_path / "end.png", (30, 160, 60))
    src = tmp_path / "src.mp4"
    make_clip_from_image(src, frame)

    report = qa.evaluate(src, frame, target_lufs=-16.0, gain_applied_db=25.0)

    assert any("게인" in w for w in report.warnings)


def test_evaluate_fails_when_landing_mismatched(tmp_path):
    end = make_frame(tmp_path / "end.png", (30, 160, 60))
    other = make_frame(tmp_path / "other.png", (200, 30, 30))
    clip = tmp_path / "clip.mp4"
    make_clip_from_image(clip, other)

    report = qa.evaluate(clip, end, target_lufs=-16.0, gain_applied_db=0.0)

    assert report.passed is False
    assert any("착지" in w for w in report.warnings)
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_qa.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.qa'`

- [ ] **Step 3: 구현**

`logo_sting/qa.py`:

```python
"""자동 품질 지표와 검수용 콘택트 시트.

자동으로 판정할 수 없는 것이 하나 있다 — 중간 구간에서 워드마크가 뭉개졌는지.
파편 조립 프리셋은 중간에 글자가 흩어지는 것이 의도된 연출이라 붕괴와 구분되지
않는다. 그래서 콘택트 시트를 만들어 사람이 보고 승인한다.
"""

from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

from .errors import FFmpegError
from . import ffmpeg_util, post
from .models import QAReport

MIN_LANDING_SSIM = 0.99
MAX_LUFS_DEVIATION = 1.0
MAX_GAIN_DB = 20.0

_SSIM_PATTERN = re.compile(r"All:\s*([\d.]+)")


def _extract_last_frame(video: Path, out_png: Path) -> Path:
    ffmpeg_util.run_ffmpeg([
        "-y", "-sseof", "-0.05", "-i", str(video), "-frames:v", "1", str(out_png)
    ])
    return out_png


def landing_ssim(video: Path, end_frame: Path) -> float:
    """마지막 프레임이 엔드프레임과 얼마나 같은지 (1.0 = 동일)."""
    ffmpeg_util.require_tools()
    with tempfile.TemporaryDirectory() as tmp:
        last = _extract_last_frame(video, Path(tmp) / "last.png")
        proc = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-i", str(last), "-i", str(end_frame),
                "-lavfi", "[0:v][1:v]scale2ref[a][b];[a][b]ssim",
                "-f", "null", "-",
            ],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
    match = _SSIM_PATTERN.search(proc.stderr)
    if not match:
        raise FFmpegError(f"SSIM 을 계산하지 못했습니다:\n{proc.stderr[-2000:]}")
    return float(match.group(1))


def evaluate(
    video: Path,
    end_frame: Path,
    target_lufs: float,
    gain_applied_db: float,
) -> QAReport:
    """마무리본을 자동 지표로 평가한다."""
    ssim = landing_ssim(video, end_frame)
    lufs = post.measure_lufs(video)

    warnings: list[str] = []
    if ssim < MIN_LANDING_SSIM:
        warnings.append(
            f"착지 프레임이 원본과 다릅니다 (SSIM {ssim:.4f}, 기준 {MIN_LANDING_SSIM}). "
            "디졸브 길이를 늘려 보세요."
        )
    if abs(lufs - target_lufs) > MAX_LUFS_DEVIATION:
        warnings.append(
            f"라우드니스가 목표에서 벗어났습니다 ({lufs:.1f} LUFS, 목표 {target_lufs:.1f})."
        )
    if gain_applied_db > MAX_GAIN_DB:
        warnings.append(
            f"오디오 게인이 {gain_applied_db:.1f}dB 입니다 — "
            "노이즈 플로어도 함께 올라왔을 수 있으니 들어보세요."
        )

    fatal = [w for w in warnings if w.startswith("착지") or w.startswith("라우드니스")]

    return QAReport(
        landing_ssim=ssim,
        output_lufs=lufs,
        gain_applied_db=gain_applied_db,
        warnings=warnings,
        passed=not fatal,
    )
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_qa.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/qa.py tests/test_qa.py
git commit -m "feat: 자동 품질 지표 — 착지 SSIM·라우드니스·게인 경고"
```

---

### Task 9: 검수용 콘택트 시트

**Files:**
- Modify: `logo_sting/qa.py`
- Modify: `tests/test_qa.py`

**Interfaces:**
- Consumes: Task 8 의 `qa` 모듈
- Produces: `qa.contact_sheet(video: Path, out_png: Path, cols: int = 6, rows: int = 5) -> Path`

전 프레임을 사람이 보는 건 불가능하고, 5초 영상을 프레임 단위로 넘기면 검수
비용이 폭발한다. 격자 한 장이면 흐름·순서·붕괴를 한눈에 본다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_qa.py` 끝에 추가:

```python
def test_contact_sheet_is_a_grid_of_frames(tmp_path):
    frame = make_frame(tmp_path / "f.png", (30, 160, 60), size=(320, 180))
    clip = tmp_path / "clip.mp4"
    make_clip_from_image(clip, frame, seconds=5)
    out = tmp_path / "sheet.png"

    qa.contact_sheet(clip, out, cols=6, rows=5)

    img = Image.open(out)
    # 6열 5행 격자이므로 가로가 세로보다 훨씬 길다
    assert img.width > img.height
    assert img.width >= 6 * 100


def test_contact_sheet_handles_portrait_video(tmp_path):
    frame = make_frame(tmp_path / "f.png", (30, 160, 60), size=(180, 320))
    clip = tmp_path / "clip.mp4"
    make_clip_from_image(clip, frame, seconds=5)
    out = tmp_path / "sheet_v.png"

    qa.contact_sheet(clip, out, cols=6, rows=5)

    assert out.exists()
    assert Image.open(out).width > 0
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_qa.py -v -k contact_sheet`
Expected: FAIL — `AttributeError: module 'logo_sting.qa' has no attribute 'contact_sheet'`

- [ ] **Step 3: 구현**

`logo_sting/qa.py` 에 추가:

```python
SHEET_CELL_WIDTH = 320


def contact_sheet(video: Path, out_png: Path, cols: int = 6, rows: int = 5) -> Path:
    """검수용 격자 이미지를 만든다.

    전 프레임을 사람이 볼 수는 없다. 격자 한 장이면 흐름·순서·붕괴를 한눈에 본다.
    """
    info = ffmpeg_util.video_info(video)
    total_cells = cols * rows
    total_frames = max(1, int(round(info.fps * info.duration)))
    step = max(1, total_frames // total_cells)

    cell_h = max(1, round(SHEET_CELL_WIDTH * info.height / info.width))
    out_png.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg_util.run_ffmpeg([
        "-y", "-i", str(video),
        "-vf", (
            f"select='not(mod(n\\,{step}))',"
            f"scale={SHEET_CELL_WIDTH}:{cell_h},"
            f"tile={cols}x{rows}"
        ),
        "-frames:v", "1",
        str(out_png),
    ])
    return out_png
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_qa.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/qa.py tests/test_qa.py
git commit -m "feat: 검수용 콘택트 시트 생성"
```

---

### Task 10: 납품 세트 조립

**Files:**
- Create: `logo_sting/packager.py`
- Test: `tests/test_packager.py`

**Interfaces:**
- Consumes: `presets.Preset`, `models.QAReport`
- Produces:
  - `packager.build_guide(preset: Preset, brand_name: str, aspect: str, duration: float) -> str`
  - `packager.package(out_zip: Path, videos: list[Path], logo_png: Path, guide_text: str, sheets: list[Path]) -> Path`

알파는 P1 에서 뺐다(스펙 3장). 대신 **검정 배경 완성본 + 원본 투명 PNG +
합성 가이드**를 묶어 편집자가 Add/Screen 으로 얹을 수 있게 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_packager.py`:

```python
import zipfile

from PIL import Image

from logo_sting import packager, presets


def test_guide_mentions_blend_mode_for_vfx_preset():
    guide = packager.build_guide(
        presets.PRESETS["forge"], brand_name="PLAZION", aspect="16:9", duration=5.0
    )

    assert "Screen" in guide or "Add" in guide
    assert "PLAZION" in guide
    assert "16:9" in guide


def test_guide_for_nature_preset_does_not_promise_screen_blend():
    """자연 계열은 밝은 배경이라 Screen 합성이 성립하지 않는다."""
    guide = packager.build_guide(
        presets.PRESETS["dew"], brand_name="GreenB", aspect="16:9", duration=5.0
    )

    assert "배경 자체가 연출" in guide


def test_package_contains_all_inputs(tmp_path):
    video = tmp_path / "final.mp4"
    video.write_bytes(b"fake-video")
    sheet = tmp_path / "sheet.png"
    Image.new("RGB", (60, 40), (0, 0, 0)).save(sheet)
    logo = tmp_path / "logo.png"
    Image.new("RGBA", (40, 20), (0, 255, 0, 255)).save(logo)
    out = tmp_path / "delivery.zip"

    packager.package(out, videos=[video], logo_png=logo, guide_text="가이드", sheets=[sheet])

    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        assert "final.mp4" in names
        assert "로고원본/logo.png" in names
        assert "검수/sheet.png" in names
        assert "합성가이드.txt" in names
        assert z.read("합성가이드.txt").decode("utf-8") == "가이드"


def test_package_creates_parent_directory(tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"x")
    logo = tmp_path / "l.png"
    Image.new("RGBA", (10, 10)).save(logo)
    out = tmp_path / "nested" / "deep" / "delivery.zip"

    packager.package(out, videos=[video], logo_png=logo, guide_text="g", sheets=[])

    assert out.exists()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_packager.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.packager'`

- [ ] **Step 3: 구현**

`logo_sting/packager.py`:

```python
"""납품 세트 조립.

투명 알파 영상은 P1 에서 뺐다 — 루마키로는 어두운 로고를 배경과 분리할 수 없고
(로고 하위 25% 휘도 44.6 vs 배경 3.0), 크로마키는 화염에 색이 물들며,
더블 패스 매트는 AI 가 매번 다른 영상을 뱉어 불가능하다.

대신 검정 배경 완성본 + 원본 투명 PNG + 합성 가이드를 묶는다.
실무 로고 스팅은 원래 이렇게 나간다.
"""

from __future__ import annotations

import zipfile
from pathlib import Path

from .presets import Preset

_VFX_GUIDE = """\
{brand} 로고 스팅 합성 가이드
프리셋: {preset} / 비율: {aspect} / 길이: {duration:.2f}초

1. 완성본(mp4)을 타임라인에 얹습니다.
2. 다른 영상 위에 겹칠 때는 블렌드 모드를 Screen 또는 Add 로 설정하세요.
   배경이 순수 검정이라 검정이 투명처럼 빠집니다.
3. 마지막 정지 로고를 픽셀 정확하게 쓰고 싶으면 '로고원본' 폴더의
   투명 PNG 를 맨 위에 얹으세요. 완성본의 착지 프레임과 위치가 같습니다.
4. 오디오는 이미 정규화돼 있습니다. 다른 트랙과 섞을 때만 조정하세요.

주의: 이 영상에는 알파 채널이 없습니다. Screen/Add 합성을 전제로 만들어졌습니다.
"""

_NATURE_GUIDE = """\
{brand} 로고 스팅 합성 가이드
프리셋: {preset} / 비율: {aspect} / 길이: {duration:.2f}초

1. 완성본(mp4)을 그대로 사용하세요.
2. 이 프리셋은 배경 자체가 연출입니다 — 물결·잎·안개를 걷어내면 남는 것이
   없으므로 다른 영상 위에 겹치는 용도가 아닙니다. 단독 컷으로 쓰세요.
3. 마지막 정지 로고를 픽셀 정확하게 쓰고 싶으면 '로고원본' 폴더의
   투명 PNG 를 맨 위에 얹으세요.
4. 오디오는 이미 정규화돼 있습니다. 자연음이라 조용한 것이 정상입니다.
"""


def build_guide(preset: Preset, brand_name: str, aspect: str, duration: float) -> str:
    """프리셋 계열에 맞는 합성 가이드 텍스트를 만든다."""
    template = _VFX_GUIDE if preset.family == "vfx" else _NATURE_GUIDE
    return template.format(
        brand=brand_name, preset=preset.key, aspect=aspect, duration=duration
    )


def package(
    out_zip: Path,
    videos: list[Path],
    logo_png: Path,
    guide_text: str,
    sheets: list[Path],
) -> Path:
    """완성본·로고 원본·검수 시트·가이드를 하나의 zip 으로 묶는다."""
    out_zip.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for video in videos:
            z.write(video, video.name)
        z.write(logo_png, f"로고원본/{logo_png.name}")
        for sheet in sheets:
            z.write(sheet, f"검수/{sheet.name}")
        z.writestr("합성가이드.txt", guide_text)
    return out_zip
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_packager.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/packager.py tests/test_packager.py
git commit -m "feat: 납품 세트 조립 — 완성본·로고 원본·검수 시트·합성 가이드"
```

---

### Task 11: Higgsfield 생성 어댑터

**Files:**
- Create: `logo_sting/generator.py`
- Test: `tests/test_generator.py`

**Interfaces:**
- Consumes: `models.RenderSpec`, `presets.PRESETS`, `presets.build_prompt`
- Produces:
  - `generator.GenerationRequest(model:str, mode:str, duration:int, resolution:str, aspect_ratio:str, generate_audio:bool, bitrate_mode:str, medias:list[dict], prompt:str)`
  - `generator.build_request(spec: RenderSpec, end_frame_media_id: str, color: str, accent: str) -> GenerationRequest`
  - `generator.Generator` (Protocol): `submit(req) -> str`, `poll(job_id) -> str`, `download(job_id, dst) -> Path`
  - `generator.HiggsfieldGenerator(api_key: str, client: httpx.Client | None = None)`

실제 생성은 느리고 비싸다. **계약 테스트로 파라미터 조립만 검증**하고 실호출은
수동 스모크 1회로 끝낸다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_generator.py`:

```python
from pathlib import Path

import pytest

from logo_sting import generator
from logo_sting.models import RenderSpec


def make_spec(preset_key="forge", aspect="16:9"):
    return RenderSpec(
        preset_key=preset_key,
        aspect=aspect,
        brand_name="PLAZION",
        logo_path=Path("logo.png"),
        brand_rgb=(107, 47, 191),
    )


def test_request_always_uses_omni_reference_mode():
    """mode 를 빠뜨리면 422 가 난다: end_image 는 omni_reference 에서만 허용."""
    req = generator.build_request(make_spec(), "media-1", color="violet", accent="deep purple")

    assert req.mode == "omni_reference"
    assert req.model == "seedance_2_5"


def test_request_sends_exactly_one_end_image():
    """start_image 와 end_image 를 둘 다 주면 최종 워드마크 색이 변질된다."""
    req = generator.build_request(make_spec(), "media-1", color="violet", accent="deep purple")

    roles = [m["role"] for m in req.medias]
    assert roles == ["end_image"]
    assert req.medias[0]["value"] == "media-1"


def test_request_enables_audio_and_high_bitrate():
    req = generator.build_request(make_spec(), "m", color="violet", accent="purple")

    assert req.generate_audio is True
    assert req.bitrate_mode == "high"
    assert req.resolution == "1080p"
    assert req.duration == 5


def test_request_carries_aspect_ratio():
    req = generator.build_request(make_spec(aspect="9:16"), "m", color="c", accent="a")

    assert req.aspect_ratio == "9:16"


def test_request_prompt_comes_from_preset():
    req = generator.build_request(make_spec("dew"), "m", color="fresh green", accent="emerald")

    assert "no fire" in req.prompt
    assert "PLAZION" in req.prompt


def test_unknown_preset_raises():
    with pytest.raises(KeyError):
        generator.build_request(make_spec("없는프리셋"), "m", color="c", accent="a")


class FakeGenerator:
    """Generator 프로토콜을 만족하는 테스트 대역."""

    def __init__(self):
        self.submitted: list[generator.GenerationRequest] = []

    def submit(self, req):
        self.submitted.append(req)
        return "job-1"

    def poll(self, job_id):
        return "completed"

    def download(self, job_id, dst):
        dst.write_bytes(b"video")
        return dst


def test_fake_generator_satisfies_protocol(tmp_path):
    gen: generator.Generator = FakeGenerator()
    req = generator.build_request(make_spec(), "m", color="c", accent="a")

    job_id = gen.submit(req)

    assert gen.poll(job_id) == "completed"
    assert gen.download(job_id, tmp_path / "out.mp4").exists()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_generator.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.generator'`

- [ ] **Step 3: 구현**

`logo_sting/generator.py`:

```python
"""Higgsfield Seedance 2.5 생성 어댑터.

5개 모듈 중 이것만 인터페이스로 분리한다. 모델이 바뀌어도 나머지 넷은 안 건드린다.

크레딧을 쓰는 호출이므로 절대 자동 재시도하지 않는다. 실패하면 멈추고 사람에게 묻는다.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

import httpx

from .models import RenderSpec
from .presets import PRESETS, build_prompt

API_BASE = "https://api.higgsfield.ai"
POLL_INTERVAL_SECONDS = 10
POLL_TIMEOUT_SECONDS = 900   # 오디오 포함 1080p 5초는 3~6분 걸린다


@dataclass(frozen=True)
class GenerationRequest:
    model: str
    mode: str
    duration: int
    resolution: str
    aspect_ratio: str
    generate_audio: bool
    bitrate_mode: str
    prompt: str
    medias: list[dict] = field(default_factory=list)

    def to_params(self) -> dict:
        return {
            "model": self.model,
            "mode": self.mode,
            "duration": self.duration,
            "resolution": self.resolution,
            "aspect_ratio": self.aspect_ratio,
            "generate_audio": self.generate_audio,
            "bitrate_mode": self.bitrate_mode,
            "prompt": self.prompt,
            "medias": self.medias,
        }


def build_request(
    spec: RenderSpec,
    end_frame_media_id: str,
    color: str,
    accent: str,
) -> GenerationRequest:
    """생성 요청 파라미터를 조립한다.

    두 가지가 반드시 지켜져야 한다:
    - mode 는 omni_reference. 빠뜨리면 422 ("end_image 는 omni_reference 에서만 허용")
    - end_image 는 정확히 하나. start_image 를 같이 주면 최종 워드마크 색이 변질된다
    """
    preset = PRESETS[spec.preset_key]
    return GenerationRequest(
        model="seedance_2_5",
        mode="omni_reference",
        duration=5,
        resolution="1080p",
        aspect_ratio=spec.aspect,
        generate_audio=True,
        bitrate_mode="high",
        prompt=build_prompt(preset, spec.brand_name, color, accent),
        medias=[{"role": "end_image", "value": end_frame_media_id}],
    )


class Generator(Protocol):
    """생성 백엔드가 만족해야 하는 계약."""

    def submit(self, req: GenerationRequest) -> str: ...
    def poll(self, job_id: str) -> str: ...
    def download(self, job_id: str, dst: Path) -> Path: ...


class HiggsfieldGenerator:
    """Higgsfield API 구현."""

    def __init__(self, api_key: str, client: httpx.Client | None = None):
        self._client = client or httpx.Client(
            base_url=API_BASE,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0,
        )

    def submit(self, req: GenerationRequest) -> str:
        resp = self._client.post("/v1/videos", json={"params": req.to_params()})
        resp.raise_for_status()
        return resp.json()["job_id"]

    def poll(self, job_id: str) -> str:
        """상태를 한 번 조회한다.

        진행 중 type 이 "image" 로 표시되는 것은 Seedance 2.5 의 표기 오류다.
        status 만 신뢰한다.
        """
        resp = self._client.get(f"/v1/jobs/{job_id}")
        resp.raise_for_status()
        return resp.json()["status"]

    def wait(self, job_id: str) -> str:
        """완료까지 기다린다. 절대 재제출하지 않는다 — 중복 과금이 된다."""
        deadline = time.monotonic() + POLL_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            status = self.poll(job_id)
            if status in ("completed", "failed"):
                return status
            time.sleep(POLL_INTERVAL_SECONDS)
        raise TimeoutError(
            f"생성이 {POLL_TIMEOUT_SECONDS}초 안에 끝나지 않았습니다 (job {job_id}). "
            "재제출하지 마세요 — 크레딧이 중복 차감됩니다. 대시보드에서 상태를 확인하세요."
        )

    def download(self, job_id: str, dst: Path) -> Path:
        resp = self._client.get(f"/v1/jobs/{job_id}")
        resp.raise_for_status()
        url = resp.json()["result_url"]
        dst.parent.mkdir(parents=True, exist_ok=True)
        with self._client.stream("GET", url) as stream:
            stream.raise_for_status()
            with dst.open("wb") as f:
                for chunk in stream.iter_bytes():
                    f.write(chunk)
        return dst
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/test_generator.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/generator.py tests/test_generator.py
git commit -m "feat: Higgsfield 생성 어댑터 — 파라미터 조립과 폴링 계약"
```

---

### Task 12: 파이프라인 연결과 CLI

**Files:**
- Create: `logo_sting/cli.py`
- Create: `README.md`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: 앞의 모든 모듈
- Produces:
  - `cli.finish(raw_video: Path, end_frame: Path, preset_key: str, out_dir: Path) -> tuple[Path, QAReport, Path]` — (완성본, QA 리포트, 콘택트 시트)
  - `cli.main(argv: list[str] | None = None) -> int`

`finish` 를 별도 함수로 분리하는 이유: **마무리만 다시 돌릴 수 있어야 한다.**
생성은 45크레딧이지만 마무리는 공짜다. 오디오 게인 하나 고치려고 재생성하면 돈이 샌다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_cli.py`:

```python
import pytest
from PIL import Image

from logo_sting import cli, ffmpeg_util


def make_clip(path, seconds=5, size=(320, 180)):
    ffmpeg_util.run_ffmpeg([
        "-y",
        "-f", "lavfi", "-i", f"color=c=black:s={size[0]}x{size[1]}:r=24:d={seconds}",
        "-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}",
        "-filter:a", "volume=0.02",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        str(path),
    ])


def make_end_frame(path, size=(320, 180)):
    Image.new("RGB", size, (4, 4, 6)).save(path)
    return path


def test_finish_produces_video_report_and_sheet(tmp_path):
    raw = tmp_path / "raw.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(raw, seconds=5.06)
    out_dir = tmp_path / "out"

    final, report, sheet = cli.finish(raw, end, preset_key="forge", out_dir=out_dir)

    assert final.exists()
    assert sheet.exists()
    assert ffmpeg_util.video_info(final).duration == pytest.approx(5.0, abs=0.1)
    assert report.landing_ssim > 0.99


def test_finish_does_not_modify_the_raw_input(tmp_path):
    """생성 원본은 절대 덮어쓰지 않는다."""
    raw = tmp_path / "raw.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(raw, seconds=5)
    before = raw.read_bytes()

    cli.finish(raw, end, preset_key="forge", out_dir=tmp_path / "out")

    assert raw.read_bytes() == before


def test_finish_applies_preset_loudness_target(tmp_path):
    """자연 계열은 −20 LUFS, VFX 계열은 −16 LUFS."""
    raw = tmp_path / "raw.mp4"
    end = make_end_frame(tmp_path / "end.png")
    make_clip(raw, seconds=5)

    _, nature_report, _ = cli.finish(raw, end, "dew", tmp_path / "n")
    _, vfx_report, _ = cli.finish(raw, end, "forge", tmp_path / "v")

    assert nature_report.output_lufs == pytest.approx(-20.0, abs=1.5)
    assert vfx_report.output_lufs == pytest.approx(-16.0, abs=1.5)


def test_cli_scan_reports_contamination(tmp_path, capsys):
    logo = tmp_path / "logo.png"
    img = Image.new("RGBA", (1200, 300), (154, 205, 50, 255))
    px = img.load()
    for y in range(150):          # 절반을 보라로 오염
        for x in range(1200):
            px[x, y] = (140, 60, 220, 255)
    img.save(logo)

    code = cli.main(["scan", str(logo), "--brand-rgb", "154,205,50"])

    assert code == 1
    assert "색조" in capsys.readouterr().out


def test_cli_scan_passes_clean_logo(tmp_path, capsys):
    logo = tmp_path / "clean.png"
    Image.new("RGBA", (1200, 300), (154, 205, 50, 255)).save(logo)

    code = cli.main(["scan", str(logo), "--brand-rgb", "154,205,50"])

    assert code == 0
    assert "통과" in capsys.readouterr().out
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pytest tests/test_cli.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'logo_sting.cli'`

- [ ] **Step 3: 구현**

`logo_sting/cli.py`:

```python
"""CLI 엔트리와 파이프라인 연결.

finish() 를 별도 함수로 둔 이유: 마무리만 다시 돌릴 수 있어야 한다.
생성은 45크레딧이지만 마무리는 공짜다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import logo_prep, post, qa
from .models import QAReport
from .presets import ASPECTS, PRESETS


def finish(
    raw_video: Path,
    end_frame: Path,
    preset_key: str,
    out_dir: Path,
) -> tuple[Path, QAReport, Path]:
    """생성 원본을 마무리한다. (완성본, QA 리포트, 콘택트 시트)를 돌려준다.

    raw_video 는 읽기만 한다 — 절대 덮어쓰지 않는다.
    """
    preset = PRESETS[preset_key]
    out_dir.mkdir(parents=True, exist_ok=True)

    landed = out_dir / "01_landed.mp4"
    timed = out_dir / "02_timed.mp4"
    final = out_dir / "final.mp4"

    post.replace_landing(raw_video, end_frame, landed, preset.dissolve_seconds)
    post.normalize_timing(landed, timed, duration=5.0, fps=24)
    gain = post.normalize_audio(timed, final, target_lufs=preset.target_lufs)

    report = qa.evaluate(final, end_frame, preset.target_lufs, gain)
    sheet = qa.contact_sheet(final, out_dir / "contact_sheet.png")
    return final, report, sheet


def _parse_rgb(text: str) -> tuple[int, int, int]:
    parts = [int(p) for p in text.split(",")]
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("--brand-rgb 는 'R,G,B' 형식이어야 합니다")
    return (parts[0], parts[1], parts[2])


def _cmd_scan(args) -> int:
    scan = logo_prep.scan_logo(Path(args.logo), args.brand_rgb)
    print(f"크기: {scan.width}x{scan.height}  알파: {'있음' if scan.has_alpha else '없음'}")
    print(f"브랜드 외 색조: {scan.off_brand_ratio:.1%}  불투명 비율: {scan.solid_ratio:.1%}")
    for problem in scan.problems:
        print(f"  [!] {problem}")
    if scan.ok:
        print("검증 통과 — 엔드프레임을 만들 수 있습니다.")
        return 0
    return 1


def _cmd_endframe(args) -> int:
    preset = PRESETS[args.preset]
    for aspect in args.aspects:
        suffix = aspect.replace(":", "x")
        out = Path(args.out_dir) / f"endframe_{suffix}.png"
        logo_prep.build_end_frame(Path(args.logo), out, aspect, preset.background_rgb)
        print(f"생성: {out}")
    return 0


def _cmd_finish(args) -> int:
    final, report, sheet = finish(
        Path(args.raw), Path(args.end_frame), args.preset, Path(args.out_dir)
    )
    print(f"완성본: {final}")
    print(f"콘택트 시트: {sheet}")
    print(f"착지 SSIM: {report.landing_ssim:.4f}  라우드니스: {report.output_lufs:.1f} LUFS")
    for warning in report.warnings:
        print(f"  [!] {warning}")
    print("자동 검사 통과" if report.passed else "자동 검사 실패")
    print("콘택트 시트를 눈으로 확인한 뒤 승인하세요 — 중간 구간의 워드마크 붕괴는 "
          "자동으로 판정할 수 없습니다.")
    return 0 if report.passed else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logo-sting", description="로고 스팅 파이프라인")
    sub = parser.add_subparsers(dest="command", required=True)

    p_scan = sub.add_parser("scan", help="로고 소스를 검증한다")
    p_scan.add_argument("logo")
    p_scan.add_argument("--brand-rgb", type=_parse_rgb, required=True)
    p_scan.set_defaults(func=_cmd_scan)

    p_end = sub.add_parser("endframe", help="비율별 엔드프레임을 만든다")
    p_end.add_argument("logo")
    p_end.add_argument("--preset", choices=sorted(PRESETS), required=True)
    p_end.add_argument("--aspects", nargs="+", default=["16:9"], choices=sorted(ASPECTS))
    p_end.add_argument("--out-dir", default=".")
    p_end.set_defaults(func=_cmd_endframe)

    p_fin = sub.add_parser("finish", help="생성 원본을 마무리한다")
    p_fin.add_argument("raw")
    p_fin.add_argument("--end-frame", required=True)
    p_fin.add_argument("--preset", choices=sorted(PRESETS), required=True)
    p_fin.add_argument("--out-dir", required=True)
    p_fin.set_defaults(func=_cmd_finish)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
```

`README.md`:

```markdown
# Logo Sting Studio — 코어 파이프라인

브랜드 로고 PNG 한 장에서 로고 스팅 영상을 생성하고 자동으로 마무리한다.

## 요구사항

- Python 3.12+
- ffmpeg / ffprobe 가 PATH 에 있을 것

## 설치

    pip install -e ".[dev]"

## 사용

    # 1. 로고 검증
    logo-sting scan brand.png --brand-rgb 154,205,50

    # 2. 엔드프레임 생성
    logo-sting endframe brand.png --preset mist --aspects 16:9 9:16 --out-dir ./work

    # 3. (생성은 Higgsfield 에서) 원본 mp4 를 받은 뒤 마무리
    logo-sting finish raw.mp4 --end-frame work/endframe_16x9.png \
        --preset mist --out-dir ./out

## 프리셋

VFX 계열(딥블랙 배경, −16 LUFS): `forge` `shard` `arc`
자연 계열(밝은/딥그린 배경, −20 LUFS): `dew` `growth` `mist`

## 알려진 한계

- 출력에 알파 채널이 없다. VFX 계열은 Screen/Add 합성을 전제로 한다
- 중간 구간의 워드마크 붕괴는 자동 판정이 불가능하다. 콘택트 시트를 눈으로 확인할 것
- 비율마다 재생성이 필요하다 (리프레임하면 로고가 잘린다)
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pytest tests/ -v`
Expected: PASS (전체 통과, 5 + 나머지 모듈 테스트 포함)

- [ ] **Step 5: 커밋**

```bash
git add logo_sting/cli.py README.md tests/test_cli.py
git commit -m "feat: 파이프라인 연결과 CLI (scan/endframe/finish)"
```

---

## Self-Review 결과

**1. 스펙 커버리지**

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 착지 프레임 교체 | Task 7 |
| 오디오 정규화 (프리셋별 목표) | Task 5, 12 |
| 길이·fps 정규화 | Task 6 |
| 로고 소스 오염도 스캔 | Task 3 |
| 저해상도 자동 폭 축소 | Task 4 |
| 엔드프레임 생성 (비율별) | Task 4 |
| 자동 QA 지표 | Task 8 |
| 콘택트 시트 (사람 게이트) | Task 9 |
| 합성 키트 납품 | Task 10 |
| generator 인터페이스 분리 | Task 11 |
| 크레딧 호출 자동 재시도 금지 | Task 11 (`wait` 의 TimeoutError 메시지) |
| 생성 원본 불변 | Task 12 (`test_finish_does_not_modify_the_raw_input`) |

**미구현 항목과 사유:**

- **4K 업스케일** — 스펙 5장 4번. `upscale_video` 는 프리플라이트가 없고 크레딧을
  쓰므로 `generator` 확장으로 다루는 게 맞다. P1a 는 로컬 ffmpeg 파이프라인만
  다루므로 **Task 11 이후 별도 태스크로 뺀다.** P1b(웹·큐) 계획에 포함시킨다.
- **비율 세트 일괄 실행** — `endframe --aspects` 로 엔드프레임은 여러 개 만들지만,
  생성 반복은 큐가 있는 P1b 의 일이다.

**2. 플레이스홀더 스캔** — 없음. 모든 스텝에 실제 코드와 실행 명령이 있다.

**3. 타입 일관성** — `LogoScan`·`RenderSpec`·`QAReport` 는 Task 2 에서 정의하고
Task 3·8·12 에서 같은 필드명으로 쓴다. `post.normalize_audio` 는 Task 5 에서
`float`(게인)을 반환하고 Task 12 가 그 값을 `qa.evaluate` 의 `gain_applied_db`
로 넘긴다. `presets.ASPECTS` 는 Task 2 에서 정의하고 Task 4·12 에서 쓴다.
