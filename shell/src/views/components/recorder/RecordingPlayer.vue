<template>
	<div class="recorder-player" v-if="visible">
		<div class="player-header">
			<span class="player-title">{{ recordingMeta?.sessionName || "Terminal Recording" }}</span>
			<span class="player-time">{{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}</span>
			<span class="player-close" @click="close">&times;</span>
		</div>
		<div class="player-terminal" ref="terminalContainer"></div>
		<div class="player-controls">
			<el-button size="small" @click="togglePlay" :type="playing ? 'danger' : 'primary'">
				{{ playing ? $t("home.recorder.pause") : $t("home.recorder.play") }}
			</el-button>
			<el-slider
				v-model="progressPercent"
				:show-tooltip="false"
				:max="100"
				:step="0.1"
				@input="onSeek"
				class="player-progress"
			/>
			<el-select v-model="speed" size="small" class="player-speed" popper-class="player-speed-popper" @change="onSpeedChange">
				<el-option :value="0.5" label="0.5x" />
				<el-option :value="1" label="1x" />
				<el-option :value="2" label="2x" />
				<el-option :value="4" label="4x" />
			</el-select>
		</div>
	</div>
</template>

<script>
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { readRecording } from "@/services/terminalRecorder"
import xtermTheme from "xterm-theme"
import { getProfile } from "@/services/globalSetting"
import "@xterm/xterm/css/xterm.css"

export default {
	name: "RecordingPlayer",
	data() {
		return {
			visible: false,
			playing: false,
			speed: 1,
			progressPercent: 0,
			currentTime: 0,
			totalDuration: 0,
			terminal: null,
			fitAddon: null,
			events: [],
			eventIndex: 0,
			playbackTimer: null,
			lastTickTime: 0,
			recordingMeta: null,
			seeking: false
		}
	},

	methods: {
		async show(meta) {
			this.recordingMeta = meta
			this.visible = true
			this.playing = false
			this.currentTime = 0
			this.progressPercent = 0
			this.eventIndex = 0

			await this.$nextTick()

			const content = await readRecording(meta.filePath)
			if (!content) {
				console.error("[RecordingPlayer] Failed to read recording:", meta.filePath)
				return
			}

			this.parseAsciicast(content)
			this.initTerminal()
		},

		parseAsciicast(content) {
			const lines = content.split("\n").filter((l) => l.trim().length > 0)
			if (lines.length === 0) return

			const header = JSON.parse(lines[0])
			this.events = []
			this.totalDuration = 0

			for (let i = 1; i < lines.length; i++) {
				try {
					const event = JSON.parse(lines[i])
					if (event[1] === "o") {
						this.events.push({ time: event[0], data: event[2] })
						if (event[0] > this.totalDuration) {
							this.totalDuration = event[0]
						}
					}
				} catch (e) {
					// skip invalid lines
				}
			}

			this.headerWidth = header.width || 80
			this.headerHeight = header.height || 24
		},

		initTerminal() {
			if (this.terminal) {
				try {
					this.terminal.dispose()
				} catch (e) {
					// ignore
				}
			}

			const globalXtermProfile = getProfile("xterm") || {}
			const themeName = globalXtermProfile.xtermTheme || "Night_3024"
			const theme = xtermTheme[themeName] || {}

			this.terminal = new Terminal({
				cols: this.headerWidth,
				rows: this.headerHeight,
				fontSize: globalXtermProfile.fontSize || 14,
				fontFamily: globalXtermProfile.fontFamily || "courier-new, courier, monospace",
				theme,
				disableStdin: true,
				cursorBlink: false,
				scrollback: 100000
			})

			this.fitAddon = new FitAddon()
			this.terminal.loadAddon(this.fitAddon)

			this.$nextTick(() => {
				if (this.$refs.terminalContainer) {
					this.terminal.open(this.$refs.terminalContainer)
					try {
						this.fitAddon.fit()
					} catch (e) {
						// ignore
					}
				}
			})
		},

		togglePlay() {
			if (this.playing) {
				this.pause()
			} else {
				this.play()
			}
		},

		play() {
			if (this.events.length === 0) return

			if (this.currentTime >= this.totalDuration) {
				this.currentTime = 0
				this.eventIndex = 0
				this.terminal.reset()
			}

			this.playing = true
			this.lastTickTime = performance.now()

			const tick = () => {
				if (!this.playing) return

				const now = performance.now()
				const delta = (now - this.lastTickTime) / 1000 * this.speed
				this.lastTickTime = now
				this.currentTime += delta

				while (this.eventIndex < this.events.length && this.events[this.eventIndex].time <= this.currentTime) {
					this.terminal.write(this.events[this.eventIndex].data)
					this.eventIndex++
				}

				this.progressPercent = this.totalDuration > 0 ? (this.currentTime / this.totalDuration) * 100 : 0

				if (this.currentTime >= this.totalDuration || this.eventIndex >= this.events.length) {
					this.playing = false
					return
				}

				this.playbackTimer = requestAnimationFrame(tick)
			}

			this.playbackTimer = requestAnimationFrame(tick)
		},

		pause() {
			this.playing = false
			if (this.playbackTimer) {
				cancelAnimationFrame(this.playbackTimer)
				this.playbackTimer = null
			}
		},

		onSeek(percent) {
			this.seeking = true
			const wasPlaying = this.playing
			this.pause()

			this.currentTime = (percent / 100) * this.totalDuration
			this.terminal.reset()

			this.eventIndex = 0
			while (this.eventIndex < this.events.length && this.events[this.eventIndex].time <= this.currentTime) {
				this.terminal.write(this.events[this.eventIndex].data)
				this.eventIndex++
			}

			this.seeking = false

			if (wasPlaying) {
				this.play()
			}
		},

		onSpeedChange() {
			if (this.playing) {
				this.lastTickTime = performance.now()
			}
		},

		close() {
			this.pause()
			if (this.terminal) {
				try {
					this.terminal.dispose()
				} catch (e) {
					// ignore dispose errors
				}
				this.terminal = null
			}
			this.fitAddon = null
			this.visible = false
			this.events = []
			this.eventIndex = 0
		},

		formatTime(seconds) {
			const m = Math.floor(seconds / 60)
			const s = Math.floor(seconds % 60)
			return `${m}:${s.toString().padStart(2, "0")}`
		},

		beforeUnmount() {
			this.close()
		}
	}
}
</script>

<style lang="scss" scoped>
.recorder-player {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 80%;
	max-width: 1000px;
	height: 70%;
	max-height: 700px;
	background-color: var(--n-bg-color-base);
	border: 1px solid var(--n-border-color);
	border-radius: 8px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	z-index: 9999;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	.player-header {
		display: flex;
		align-items: center;
		padding: 10px 16px;
		background-color: var(--n-bg-color-light);
		border-bottom: 1px solid var(--n-border-color);

		.player-title {
			flex: 1;
			font-size: 14px;
			font-weight: 500;
			color: var(--n-text-color-base);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.player-time {
			font-size: 12px;
			color: var(--n-text-color-light);
			margin-right: 16px;
			font-family: monospace;
		}

		.player-close {
			cursor: pointer;
			font-size: 20px;
			color: var(--n-text-color-light);
			&:hover {
				color: var(--n-text-color-base);
			}
		}
	}

	.player-terminal {
		flex: 1;
		min-height: 0;
		background-color: #000;
		padding: 8px;
		overflow: hidden;

		:deep(.xterm) {
			height: 100%;
		}
	}

	.player-controls {
		display: flex;
		align-items: center;
		padding: 8px 16px;
		background-color: var(--n-bg-color-light);
		border-top: 1px solid var(--n-border-color);
		gap: 12px;

		.player-progress {
			flex: 1;
		}

		.player-speed {
			width: 80px;
		}
	}
}
</style>

<style lang="scss">
.player-speed-popper {
	z-index: 10000 !important;
}
</style>
