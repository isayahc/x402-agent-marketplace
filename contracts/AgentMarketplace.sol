// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title AgentMarketplace
/// @notice Provider registry with on-chain reputation + native-MON task escrow for
///         an agentic tool marketplace on Monad.
/// @dev    Escrow holds native MON (not ERC-20). This is the slow/trustless rail,
///         separate from the x402/USDC fast path. No owner, no admin, no upgrades,
///         no pausing. Disputes are out of scope: a delivered job can only be
///         released, never rejected. Reputation can only grow via release().
contract AgentMarketplace {
    /// @notice Lifecycle of a single escrow.
    enum Status {
        None, // 0: unused / non-existent
        Funded, // 1: buyer funded, awaiting delivery
        Delivered, // 2: provider delivered, awaiting release
        Released, // 3: paid out to provider
        Refunded // 4: returned to buyer (provider missed deadline)
    }

    /// @notice A registered tool/service provider and its reputation counters.
    struct Provider {
        address owner; // controls the provider entry; marks jobs delivered
        string capability; // e.g. "image-gen", "web-search"
        uint256 price; // advertised price in wei (MON); informational
        address payoutAddress; // where released funds are sent
        string metadataURI; // off-chain metadata (description, endpoint, etc.)
        uint256 completedJobs; // released escrows count
        uint256 ratingSum; // sum of all ratings received
        uint256 ratingCount; // number of ratings received
    }

    /// @notice A single buyer<->provider task escrow.
    struct Escrow {
        address buyer; // funded the escrow; can release or refund
        uint256 providerId; // index into `providers`
        uint256 amount; // escrowed MON in wei
        Status status; // current lifecycle state
        uint256 deadline; // unix ts after which buyer may refund if not delivered
        uint256 createdAt; // unix ts of funding
        string resultRef; // off-chain pointer to delivered result
        uint8 rating; // buyer rating given at release (1..5 by convention)
    }

    /// @dev Providers indexed by providerId (starts at 0).
    Provider[] private providers;

    /// @dev Escrows indexed by escrowId (starts at 0).
    Escrow[] private escrows;

    /// @notice Discovery index: capability string => list of providerIds.
    mapping(string => uint256[]) private capabilityToProviderIds;

    /// @notice Emitted when a provider registers.
    event ProviderRegistered(
        uint256 indexed providerId,
        address indexed owner,
        string capability,
        uint256 price,
        address payoutAddress,
        string metadataURI
    );

    /// @notice Emitted when a buyer funds a new escrow.
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed providerId,
        address indexed buyer,
        uint256 amount,
        string taskRef,
        uint256 deadline
    );

    /// @notice Emitted when the provider marks an escrow delivered.
    event Delivered(
        uint256 indexed escrowId,
        uint256 indexed providerId,
        string resultRef
    );

    /// @notice Emitted when the buyer releases funds to the provider.
    event Released(
        uint256 indexed escrowId,
        uint256 indexed providerId,
        uint256 amount,
        uint8 rating
    );

    /// @notice Emitted when the buyer reclaims funds after a missed deadline.
    event Refunded(
        uint256 indexed escrowId,
        uint256 indexed providerId,
        address indexed buyer,
        uint256 amount
    );

    // ---------------------------------------------------------------------
    // Registry
    // ---------------------------------------------------------------------

    /// @notice Register a new provider. Permissionless.
    /// @return providerId Index of the new provider.
    function registerProvider(
        string calldata capability,
        uint256 price,
        address payoutAddress,
        string calldata metadataURI
    ) external returns (uint256 providerId) {
        require(payoutAddress != address(0), "payout is zero");

        providerId = providers.length;
        providers.push(
            Provider({
                owner: msg.sender,
                capability: capability,
                price: price,
                payoutAddress: payoutAddress,
                metadataURI: metadataURI,
                completedJobs: 0,
                ratingSum: 0,
                ratingCount: 0
            })
        );

        capabilityToProviderIds[capability].push(providerId);

        emit ProviderRegistered(
            providerId,
            msg.sender,
            capability,
            price,
            payoutAddress,
            metadataURI
        );
    }

    // ---------------------------------------------------------------------
    // Escrow lifecycle
    // ---------------------------------------------------------------------

    /// @notice Fund a new escrow against a provider. Pays in native MON.
    /// @return escrowId Index of the new escrow.
    function createEscrow(
        uint256 providerId,
        string calldata taskRef,
        uint256 deliverySeconds
    ) external payable returns (uint256 escrowId) {
        require(providerId < providers.length, "bad providerId");
        require(msg.value > 0, "no value");

        uint256 deadline = block.timestamp + deliverySeconds;

        escrowId = escrows.length;
        escrows.push(
            Escrow({
                buyer: msg.sender,
                providerId: providerId,
                amount: msg.value,
                status: Status.Funded,
                deadline: deadline,
                createdAt: block.timestamp,
                resultRef: "",
                rating: 0
            })
        );

        emit EscrowCreated(
            escrowId,
            providerId,
            msg.sender,
            msg.value,
            taskRef,
            deadline
        );
    }

    /// @notice Provider marks an escrow's work as delivered.
    /// @dev Only the provider's owner may call. Escrow must be Funded.
    function markDelivered(uint256 escrowId, string calldata resultRef) external {
        require(escrowId < escrows.length, "bad escrowId");
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.Funded, "not funded");
        require(msg.sender == providers[e.providerId].owner, "not provider");

        e.status = Status.Delivered;
        e.resultRef = resultRef;

        emit Delivered(escrowId, e.providerId, resultRef);
    }

    /// @notice Buyer releases escrowed funds to the provider and rates the job.
    /// @dev CEI: status flips to Released before any value transfer.
    function release(uint256 escrowId, uint8 rating) external {
        require(escrowId < escrows.length, "bad escrowId");
        Escrow storage e = escrows[escrowId];
        require(msg.sender == e.buyer, "not buyer");
        require(e.status == Status.Delivered, "not delivered");

        // Effects
        e.status = Status.Released;
        e.rating = rating;

        uint256 providerId = e.providerId;
        uint256 amount = e.amount;
        address payoutAddress = providers[providerId].payoutAddress;

        // Interaction
        (bool success, ) = payoutAddress.call{value: amount}("");
        require(success, "payout failed");

        // Reputation: can only grow here, after a successful release.
        Provider storage p = providers[providerId];
        p.completedJobs += 1;
        p.ratingSum += rating;
        p.ratingCount += 1;

        emit Released(escrowId, providerId, amount, rating);
    }

    /// @notice Buyer reclaims funds when the provider missed the deadline.
    /// @dev Only valid while still Funded and past the deadline. CEI ordering.
    function refund(uint256 escrowId) external {
        require(escrowId < escrows.length, "bad escrowId");
        Escrow storage e = escrows[escrowId];
        require(msg.sender == e.buyer, "not buyer");
        require(e.status == Status.Funded, "not funded");
        require(block.timestamp > e.deadline, "not past deadline");

        // Effects
        e.status = Status.Refunded;

        uint256 amount = e.amount;
        uint256 providerId = e.providerId;
        address buyer = e.buyer;

        // Interaction
        (bool success, ) = buyer.call{value: amount}("");
        require(success, "refund failed");

        emit Refunded(escrowId, providerId, buyer, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Total number of registered providers.
    function providersCount() external view returns (uint256) {
        return providers.length;
    }

    /// @notice Read a single provider by id.
    function getProvider(uint256 id) external view returns (Provider memory) {
        require(id < providers.length, "bad providerId");
        return providers[id];
    }

    /// @notice List provider ids advertising a given capability.
    function getProvidersByCapability(string calldata capability)
        external
        view
        returns (uint256[] memory)
    {
        return capabilityToProviderIds[capability];
    }

    /// @notice Total number of escrows ever created.
    function escrowsCount() external view returns (uint256) {
        return escrows.length;
    }

    /// @notice Read a single escrow by id.
    function getEscrow(uint256 id) external view returns (Escrow memory) {
        require(id < escrows.length, "bad escrowId");
        return escrows[id];
    }
}
