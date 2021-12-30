/*global describe, context, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ServiceRegistry", function () {
    let componentRegistry;
    let agentRegistry;
    let serviceRegistry;
    let signers;
    beforeEach(async function () {
        const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
        componentRegistry = await ComponentRegistry.deploy("agent components", "MECHCOMP",
            "https://localhost/component/");
        await componentRegistry.deployed();

        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy("agent", "MECH", "https://localhost/agent/",
            componentRegistry.address);
        await agentRegistry.deployed();

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy(agentRegistry.address);
        await serviceRegistry.deployed();
        signers = await ethers.getSigners();
    });

    context("Initialization", async function () {
        it("Should fail when checking for the service id existence", async function () {
            const tokenId = 0;
            expect(await serviceRegistry.exists(tokenId)).to.equal(false);
        });

        it("Should fail when trying to change the manager from a different address", async function () {
            await expect(
                serviceRegistry.connect(signers[3]).changeManager(signers[3].address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    context("Service creation", async function () {
        const name = "service name";
        const description = "service description";
        const agentSlots = [1, 3, 2, 4];
        const operatorSlots = [1, 10];
        const threshold = 1;
        const componentHash = "0x0";
        const dependencies = [];
        it("Should fail when creating a service without a manager", async function () {
            const owner = signers[3].address;
            await expect(
                serviceRegistry.createService(owner, name, description, agentSlots, operatorSlots, threshold)
            ).to.be.revertedWith("manager: MANAGER_ONLY");
        });

        it("Should fail when the owner of a service has zero address", async function () {
            const manager = signers[3];
            const AddressZero = "0x" + "0".repeat(40);
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(AddressZero, name, description, agentSlots,
                    operatorSlots, threshold)
            ).to.be.revertedWith("createService: EMPTY_OWNER");
        });

        it("Should fail when creating a service with an empty name", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, "", description, agentSlots,
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: EMPTY_NAME");
        });

        it("Should fail when creating a service with an empty description", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, "", agentSlots,
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: NO_DESCRIPTION");
        });

        it("Should fail when creating a service with incorrect agent slots values", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: AGENTS_SLOTS");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: AGENTS_SLOTS");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1, 2, 3],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: AGENTS_SLOTS");
        });

        it("Should fail when creating a service with incorrect operator slots values", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                    [], threshold)
            ).to.be.revertedWith("serviceInfo: OPERATOR_SLOTS");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                    [0], threshold)
            ).to.be.revertedWith("serviceInfo: OPERATOR_SLOTS");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                    [5, 2], threshold)
            ).to.be.revertedWith("serviceInfo: OPERATOR_SLOTS");
        });

        it("Should fail when creating a service with incorrect number of instances in agent slots", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1, 0, 1, 2],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: SLOTS_NUMBER");
        });

        it("Should fail when creating a service with non existent canonical agent", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [0, 1],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: AGENT_NOT_FOUND");
        });

        it("Should fail when creating a service with duplicate canonical agents in agent slots", async function () {
            const minter = signers[3];
            const manager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeMinter(minter.address);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash, description, []);
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1, 2, 1, 2],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: DUPLICATE_AGENT");
        });

        it("Should fail when creating a service with other incorrect input parameters", async function () {
            const minter = signers[3];
            const manager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeMinter(minter.address);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash, description, []);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash + "1", description, []);
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1, 2, 0, 2],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: AGENT_NOT_FOUND");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, [1, 2, 2, 0],
                    operatorSlots, threshold)
            ).to.be.revertedWith("serviceInfo: SLOTS_NUMBER");
        });

        it("Checking for different signers threshold combinations", async function () {
            const minter = signers[3];
            const manager = signers[4];
            const owner = signers[5].address;
            const maxThreshold = agentSlots[1] + agentSlots[3];
            const minThreshold = Math.floor(maxThreshold * 2 / 3 + 1);
            await agentRegistry.changeMinter(minter.address);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash, description, []);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash + "1", description, []);
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                    operatorSlots, minThreshold - 1)
            ).to.be.revertedWith("serviceInfo: THRESHOLD");
            await expect(
                serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                    operatorSlots, maxThreshold + 1)
            ).to.be.revertedWith("serviceInfo: THRESHOLD");
            await serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                operatorSlots, minThreshold);
            await serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                operatorSlots, maxThreshold);
        });

        it("Catching \"CreateServiceTransaction\" event log after registration of a service", async function () {
            const minter = signers[3];
            const manager = signers[4];
            const owner = signers[5].address;
            const maxThreshold = agentSlots[1] + agentSlots[3];
            await agentRegistry.changeMinter(minter.address);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash, description, []);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash + "1", description, []);
            await serviceRegistry.changeManager(manager.address);
            const service = await serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                operatorSlots, maxThreshold);
            const result = await service.wait();
            expect(result.events[0].event).to.equal("CreateServiceTransaction");
        });

        it("Service Id=1 after first successful service registration must exist", async function () {
            const minter = signers[3];
            const manager = signers[4];
            const owner = signers[5].address;
            const maxThreshold = agentSlots[1] + agentSlots[3];
            await agentRegistry.changeMinter(minter.address);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash, description, []);
            await agentRegistry.connect(minter).createAgent(owner, owner, componentHash + "1", description, []);
            await serviceRegistry.changeManager(manager.address);
            await serviceRegistry.connect(manager).createService(owner, name, description, agentSlots,
                operatorSlots, maxThreshold);
            expect(await serviceRegistry.exists(1)).to.equal(true);
        });
    });

    context("Service update", async function () {
        const name = "service name";
        const description = "service description";
        const agentSlots = [1, 3, 2, 4];
        const operatorSlots = [1, 10];
        const threshold = 1;
        const componentHash = "0x0";
        const dependencies = [];
        it("Should fail when creating a service without a manager", async function () {
            const owner = signers[3].address;
            await expect(
                serviceRegistry.createService(owner, name, description, agentSlots, operatorSlots, threshold)
            ).to.be.revertedWith("manager: MANAGER_ONLY");
        });

        it("Should fail when trying to update a non-existent service", async function () {
            const manager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(manager.address);
            await expect(
                serviceRegistry.connect(manager).updateService(owner, name, description, agentSlots,
                    operatorSlots, threshold, 0)
            ).to.be.revertedWith("serviceOwner: SERVICE_NOT_FOUND");
        });
    });
});
