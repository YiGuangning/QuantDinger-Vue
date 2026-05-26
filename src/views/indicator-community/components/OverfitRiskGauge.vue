<template>
  <a-tooltip v-if="visible" :title="tooltipText" placement="top">
    <div class="overfit-gauge" :class="levelClass" @click.stop>
      <div class="overfit-gauge__head">
        <span class="overfit-gauge__title">
          <a-icon v-if="isElevated" type="warning" theme="filled" class="overfit-gauge__warn-icon" />
          {{ $t('community.overfitRisk.title') }}
        </span>
        <span class="overfit-gauge__badge">{{ levelLabel }}</span>
      </div>

      <div class="overfit-gauge__track-row">
        <span class="overfit-gauge__edge">{{ $t('community.overfitRisk.low') }}</span>
        <div class="overfit-gauge__track">
          <div class="overfit-gauge__gradient" />
          <div class="overfit-gauge__marker" :style="markerStyle">
            <span class="overfit-gauge__marker-dot" />
          </div>
        </div>
        <span class="overfit-gauge__edge">{{ $t('community.overfitRisk.high') }}</span>
      </div>

      <div class="overfit-gauge__ticks">
        <span v-for="tick in tickLabels" :key="tick">{{ tick }}</span>
      </div>

      <p v-if="hintText" class="overfit-gauge__hint">{{ hintText }}</p>
    </div>
  </a-tooltip>
</template>

<script>
import {
  computeOverfitRisk,
  getOverfitRiskLevel,
  shouldShowOverfitGauge
} from '@/utils/overfitRisk'

export default {
  name: 'OverfitRiskGauge',
  props: {
    indicator: {
      type: Object,
      required: true
    }
  },
  computed: {
    riskScore () {
      return computeOverfitRisk(this.indicator)
    },
    level () {
      return getOverfitRiskLevel(this.riskScore)
    },
    visible () {
      return shouldShowOverfitGauge(this.indicator)
    },
    isElevated () {
      return this.level === 'high' || this.level === 'extreme'
    },
    levelClass () {
      return `overfit-gauge--${this.level}`
    },
    levelLabel () {
      const key = `community.overfitRisk.level.${this.level}`
      return this.$t(key)
    },
    markerStyle () {
      const pct = Math.min(100, Math.max(0, this.riskScore))
      return { left: `${pct}%` }
    },
    tickLabels () {
      return [
        this.$t('community.overfitRisk.tickLow'),
        this.$t('community.overfitRisk.tickMid'),
        this.$t('community.overfitRisk.tickHigh')
      ]
    },
    hintText () {
      if (this.level === 'extreme') {
        return this.$t('community.overfitRisk.hintExtreme')
      }
      if (this.level === 'high') {
        return this.$t('community.overfitRisk.hintHigh')
      }
      if (this.level === 'medium') {
        return this.$t('community.overfitRisk.hintMedium')
      }
      return ''
    },
    tooltipText () {
      const n = this.indicator.sample_size || 0
      return this.$t('community.overfitRisk.tooltip', {
        score: this.riskScore,
        n
      })
    }
  }
}
</script>

<style lang="less" scoped>
.overfit-gauge {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(250, 250, 250, 0.95) 0%, rgba(245, 245, 245, 0.85) 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__title {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.55);
    letter-spacing: 0.2px;
  }

  &__warn-icon {
    font-size: 12px;
    color: #fa8c16;
  }

  &__badge {
    flex-shrink: 0;
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    line-height: 18px;
    letter-spacing: 0.3px;
  }

  &__track-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__edge {
    flex-shrink: 0;
    font-size: 9px;
    color: rgba(0, 0, 0, 0.35);
    font-weight: 500;
    width: 14px;
    text-align: center;
  }

  &__track {
    position: relative;
    flex: 1;
    height: 8px;
    border-radius: 999px;
    overflow: visible;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  &__gradient {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      #52c41a 0%,
      #a0d911 22%,
      #faad14 48%,
      #fa8c16 72%,
      #f5222d 100%
    );
    opacity: 0.92;
  }

  &__marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    transition: left 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  &__marker-dot {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 0 2px rgba(255, 255, 255, 0.6);
  }

  &__ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    padding: 0 20px;
    font-size: 9px;
    color: rgba(0, 0, 0, 0.28);
  }

  &__hint {
    margin: 6px 0 0;
    font-size: 10px;
    line-height: 1.45;
    color: rgba(0, 0, 0, 0.45);
  }

  &--low {
    .overfit-gauge__badge {
      background: rgba(82, 196, 26, 0.12);
      color: #389e0d;
    }
    .overfit-gauge__marker-dot {
      border-color: #52c41a;
    }
  }

  &--medium {
    border-color: rgba(250, 173, 20, 0.35);
    background: linear-gradient(180deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 247, 214, 0.65) 100%);

    .overfit-gauge__badge {
      background: rgba(250, 173, 20, 0.18);
      color: #d48806;
    }
    .overfit-gauge__marker-dot {
      border-color: #faad14;
    }
    .overfit-gauge__title {
      color: rgba(0, 0, 0, 0.65);
    }
  }

  &--high {
    border-color: rgba(250, 140, 22, 0.45);
    background: linear-gradient(180deg, rgba(255, 242, 232, 0.95) 0%, rgba(255, 231, 214, 0.75) 100%);
    box-shadow: 0 2px 8px rgba(250, 140, 22, 0.12);

    .overfit-gauge__badge {
      background: rgba(250, 140, 22, 0.2);
      color: #d46b08;
    }
    .overfit-gauge__marker-dot {
      border-color: #fa8c16;
      box-shadow: 0 0 0 3px rgba(250, 140, 22, 0.2), 0 1px 4px rgba(0, 0, 0, 0.15);
    }
  }

  &--extreme {
    border-color: rgba(245, 34, 45, 0.4);
    background: linear-gradient(180deg, rgba(255, 241, 240, 0.98) 0%, rgba(255, 214, 210, 0.7) 100%);
    box-shadow: 0 2px 10px rgba(245, 34, 45, 0.14);

    .overfit-gauge__badge {
      background: rgba(245, 34, 45, 0.15);
      color: #cf1322;
    }
    .overfit-gauge__marker-dot {
      border-color: #f5222d;
      animation: overfit-pulse 1.8s ease-in-out infinite;
    }
    .overfit-gauge__warn-icon {
      color: #f5222d;
      animation: overfit-blink 2s ease-in-out infinite;
    }
    .overfit-gauge__hint {
      color: #a8071a;
      font-weight: 500;
    }
  }
}

@keyframes overfit-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 34, 45, 0.15), 0 1px 4px rgba(0, 0, 0, 0.15); }
  50% { box-shadow: 0 0 0 6px rgba(245, 34, 45, 0.08), 0 1px 4px rgba(0, 0, 0, 0.15); }
}

@keyframes overfit-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.theme-dark .overfit-gauge,
.dark-theme .overfit-gauge,
[data-theme='dark'] .overfit-gauge {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-color: rgba(255, 255, 255, 0.08);

  .overfit-gauge__title {
    color: rgba(255, 255, 255, 0.55);
  }
  .overfit-gauge__edge,
  .overfit-gauge__ticks {
    color: rgba(255, 255, 255, 0.28);
  }
  .overfit-gauge__hint {
    color: rgba(255, 255, 255, 0.45);
  }
  .overfit-gauge__marker-dot {
    background: #1f1f1f;
  }

  &.overfit-gauge--medium {
    background: linear-gradient(180deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.04) 100%);
    border-color: rgba(250, 173, 20, 0.3);
  }
  &.overfit-gauge--high {
    background: linear-gradient(180deg, rgba(250, 140, 22, 0.12) 0%, rgba(250, 140, 22, 0.05) 100%);
    border-color: rgba(250, 140, 22, 0.35);
  }
  &.overfit-gauge--extreme {
    background: linear-gradient(180deg, rgba(245, 34, 45, 0.12) 0%, rgba(245, 34, 45, 0.05) 100%);
    border-color: rgba(245, 34, 45, 0.35);
    .overfit-gauge__hint {
      color: #ff7875;
    }
  }
}
</style>
