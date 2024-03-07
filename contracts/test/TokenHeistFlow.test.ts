import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TokenHeist } from '../typechain-types'
import { CircuitInput, exportCallDataGroth16 } from '../utils/zkp'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployFixture } from './deployFixture'
import { exportContractFlatten, exportFlatten, exportFlatten2, flatten } from '../utils'

/**
	Board:			Prize Map:
	[0, 1, 2,		[1, 2, 1,
	 3, 4, 5,		 2, 3, 4,
	 6, 7, 8]		 3, 5, 4]
*/
describe('TokenHeist Simple Game Flow', function () {
	let tokenHeistPlayer1: TokenHeist
	let tokenHeistPlayer2: TokenHeist
	let player1: SignerWithAddress
	let player2: SignerWithAddress

	before(async function () {
		const fixture = await loadFixture(deployFixture)

		player1 = fixture.player1
		player2 = fixture.player2
		tokenHeistPlayer1 = fixture.tokenHeistPlayer1
		tokenHeistPlayer2 = fixture.tokenHeistPlayer2
	})

	it('should register two players and start the game', async function () {
		await expect(tokenHeistPlayer1.register(1)).to.emit(tokenHeistPlayer1, 'Registered').withArgs(player1.address)
		await expect(tokenHeistPlayer2.register(2))
			.to.emit(tokenHeistPlayer2, 'GameStarted')
			.withArgs(player1.address, player2.address)
	})

	it("should be player1's turn", async function () {
		expect(await tokenHeistPlayer1.currentPlayer()).to.equal(player1.address)
	})

	it('should play the first move by thief', async function () {
		const input: CircuitInput = {
			paths: [
				[1, 0],
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			],
			ambushes: [
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			],
		}
		const dataResult = await exportCallDataGroth16(input)

		await expect(tokenHeistPlayer1.sneak(dataResult.a, dataResult.b, dataResult.c, dataResult.Input))
			.to.emit(tokenHeistPlayer2, 'Sneak')
			.withArgs(1, player1.address, false)
	})

	it('should dispatch a cop by police', async function () {
		expect(await tokenHeistPlayer2.currentPlayer()).to.equal(player2.address)
		await expect(await tokenHeistPlayer2.dispatch(1, 2))
			.to.emit(tokenHeistPlayer2, 'Dispatch')
			.withArgs(1, player2.address)
		expect(await tokenHeistPlayer2.currentPlayer()).to.equal(player1.address)
		expect(await tokenHeistPlayer2.flattenedAmbushes()).to.deep.equal(
			exportContractFlatten([
				[1, 2],
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			]),
		)
	})

	/**
		Round 1: thief (player1) wins

			thief:                  police:                 notice:
		1.	[1, -1, -1, -1, -1]     [7, -1, -1, -1, -1]     false
		2.	[1, 4, -1, -1, -1]		[7, 8, -1, -1, -1]		false
		3.	[1, 4, 3, -1, -1]		[7, 8, 4, -1, -1] 		true
		4.	[1, 4, 3, 0, -1]		[7, 8, 4, 5, -1]		false
		5.	[1, 4, 3, 0, 1]			[7, 8, 4, 5, 6]			false
			reveal()

		thief's score: 8

		
		thief: [1, 0], [-1, -1], [-1, -1], [-1, -1], [-1, -1]
		police: [1, 2], [-1, -1], [-1, -1], [-1, -1], [-1, -1]

		2.
		thief: [1, 0], [1, 1], [-1, -1], [-1, -1], [-1, -1]
		police: [1, 2], [2, 2], [-1, -1], [-1, -1], [-1, -1]

		3.
		thief: [1, 0], [1, 1], [0, 1], [-1, -1], [-1, -1]
		police: [1, 2], [2, 2], [1, 1], [-1, -1], [-1, -1]
		
		4.
		thief: [1, 0], [1, 1], [0, 1], [0, 0], [-1, -1]  	noticed: true
		police: [1, 2], [2, 2], [1 ,1], [2, 1], [-1, -1]
		
		5.
		thief: [1, 0], [1, 1], [0, 1], [0, 0], [1, 0]
		police: [1, 2], [2, 2], [1 ,1], [2, 1], [0, 2]		
				
				
	*/
	it('should process the first round', async function () {
		// 2.
		let input: CircuitInput = {
			paths: [
				[1, 0],
				[1, 1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			],
			ambushes: [
				[1, 2],
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			],
		}
		let dataResult = await exportCallDataGroth16(input)
		await expect(tokenHeistPlayer1.sneak(dataResult.a, dataResult.b, dataResult.c, dataResult.Input))
			.to.emit(tokenHeistPlayer1, 'Sneak')
			.withArgs(1, player1.address, false)
		await tokenHeistPlayer2.dispatch(2, 2)

		// 3.
		input = {
			paths: [
				[1, 0],
				[1, 1],
				[0, 1],
				[-1, -1],
				[-1, -1],
			],
			ambushes: [
				[1, 2],
				[2, 2],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			],
		}
		dataResult = await exportCallDataGroth16(input)
		await expect(tokenHeistPlayer1.sneak(dataResult.a, dataResult.b, dataResult.c, dataResult.Input))
			.to.emit(tokenHeistPlayer1, 'Sneak')
			.withArgs(1, player1.address, false)
		await tokenHeistPlayer2.dispatch(1, 1)

		// 4.
		input = {
			paths: [
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
				[-1, -1],
			],
			ambushes: [
				[1, 2],
				[2, 2],
				[1, 1],
				[-1, -1],
				[-1, -1],
			],
		}
		dataResult = await exportCallDataGroth16(input)
		await expect(tokenHeistPlayer1.sneak(dataResult.a, dataResult.b, dataResult.c, dataResult.Input))
			.to.emit(tokenHeistPlayer1, 'Sneak')
			.withArgs(1, player1.address, true)
		await tokenHeistPlayer2.dispatch(2, 1)

		// 5.
		input = {
			paths: [
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
				[1, 0],
			],
			ambushes: [
				[1, 2],
				[2, 2],
				[1, 1],
				[2, 1],
				[-1, -1],
			],
		}
		dataResult = await exportCallDataGroth16(input)
		await expect(tokenHeistPlayer1.sneak(dataResult.a, dataResult.b, dataResult.c, dataResult.Input))
			.to.emit(tokenHeistPlayer1, 'Sneak')
			.withArgs(1, player1.address, false)
		await tokenHeistPlayer2.dispatch(0, 2)
	})

	it('should reveal by player 1 and then interchage turns', async function () {
		const input: CircuitInput = {
			paths: [
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
				[1, 0],
			],
			ambushes: [
				[1, 2],
				[2, 2],
				[1, 1],
				[2, 1],
				[0, 2],
			],
		}
		const dataResult = await exportCallDataGroth16(input)
		await expect(
			tokenHeistPlayer1.reveal(
				exportFlatten(input.paths),
				dataResult.a,
				dataResult.b,
				dataResult.c,
				dataResult.Input,
			),
		)
			.to.emit(tokenHeistPlayer1, 'Reveal')
			.withArgs(1, player1.address, exportFlatten(input.paths))

		// interchage turns
		expect(await tokenHeistPlayer1.gameState()).to.equal(2)
		expect(await tokenHeistPlayer1.roles(1)).to.equal(player2.address)
		expect(await tokenHeistPlayer1.roles(2)).to.equal(player1.address)
		expect(await tokenHeistPlayer1.currentPlayer()).to.equal(player2.address)
		expect(await tokenHeistPlayer1.commitment()).to.equal(0)
		expect(await tokenHeistPlayer1.scores(0)).to.equal(8)
		expect(await tokenHeistPlayer1.copUsedCount()).to.equal(0)
		expect(await tokenHeistPlayer1.flattenedAmbushes()).to.deep.equal(
			exportContractFlatten([
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
				[-1, -1],
			]),
		)
	})

	/**
		Round 2: police (player1) wins

		thief:                  police:                 notice:
		[5, -1, -1, -1, -1]     [1, -1, -1, -1, -1]     false
		[5, 8, -1, -1, -1]		[1, 7, -1, -1, -1]		true
		[5, 8, 5, -1, -1]		[1, 7, 5, -1, -1] 		
		reveal()

		thief's score: 0
	*/

	/**
		scores: [8, 0]
	 */
	it('should be ended', async function () {})
})
