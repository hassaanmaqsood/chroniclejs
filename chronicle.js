/**
 * @file A simple Git-like version control system for JSON and string data structures.
 * @author Hassaan Maqsood
 * @license MIT
 */

/**
 * A class representing a simple Git-like versioning system.
 * It supports commits, branches, history, and more advanced operations like forking and merging.
 * This allows for embeddable version control within applications.
 *
 * @class VersionControl
 */
class VersionControl {
    /**
     * Creates an instance of VersionControl.
     * @param {*} [initialData=null] - The initial data to commit. If provided, an initial commit is created.
     */
    constructor(initialData = null) {
      /** @private */
      this.commits = {};
      /** @private */
      this.branches = { main: null };
      /** @private */
      this.currentBranch = 'main';
      /** @private */
      this.HEAD = null;
      
      if (initialData !== null) {
        this.commit(initialData, 'Initial commit');
      }
    }
  
    /**
     * Creates a new commit with the given data and message.
     *
     * @param {*} data - The data to store in the commit.
     * @param {string} [message='Update'] - The commit message.
     * @returns {string} The ID of the newly created commit.
     */
    commit(data, message = 'Update') {
      const commitId = this._generateCommitId();
      const timestamp = new Date().toISOString();
      
      const commit = {
        id: commitId,
        data: this._deepClone(data),
        message,
        timestamp,
        parent: this.HEAD,
        branch: this.currentBranch
      };
      
      this.commits[commitId] = commit;
      this.HEAD = commitId;
      this.branches[this.currentBranch] = commitId;
      
      return commitId;
    }
  
    /**
     * Gets the data from the commit at the current HEAD.
     *
     * @returns {*} A deep clone of the data at the current HEAD, or null if there are no commits.
     */
    getData() {
      if (!this.HEAD) return null;
      return this._deepClone(this.commits[this.HEAD].data);
    }
  
    /**
     * Retrieves the data from a specific commit.
     *
     * @param {string} commitId - The ID of the commit to retrieve.
     * @returns {*} A deep clone of the data from the specified commit.
     * @throws {Error} If the commit with the given ID is not found.
     */
    getCommit(commitId) {
      const commit = this.commits[commitId];
      if (!commit) throw new Error(`Commit ${commitId} not found`);
      return this._deepClone(commit.data);
    }
  
    /**
     * Checks out a specific branch or commit.
     *
     * @param {string} target - The name of the branch or the ID of the commit to check out.
     * @returns {*} The data at the new HEAD.
     * @throws {Error} If the branch or commit is not found.
     */
    checkout(target) {
      if (this.branches[target]) {
        this.currentBranch = target;
        this.HEAD = this.branches[target];
        return this.getData();
      }
      
      if (this.commits[target]) {
        this.HEAD = target;
        // Note: This results in a "detached HEAD" state, as we're not on a branch.
        // For simplicity, we don't explicitly handle this state differently here.
        return this.getData();
      }
      
      throw new Error(`Branch or commit '${target}' not found`);
    }
  
    /**
     * Creates a new branch from the current HEAD.
     *
     * @param {string} branchName - The name for the new branch.
     * @returns {string} The name of the created branch.
     * @throws {Error} If a branch with the same name already exists.
     */
    branch(branchName) {
      if (this.branches[branchName]) {
        throw new Error(`Branch '${branchName}' already exists`);
      }
      
      this.branches[branchName] = this.HEAD;
      return branchName;
    }
  
    /**
     * Switches to a branch. If the branch doesn't exist, it is created.
     *
     * @param {string} branchName - The name of the branch to switch to or create.
     */
    switchBranch(branchName) {
      if (!this.branches[branchName]) {
        this.branch(branchName);
      }
      this.currentBranch = branchName;
      this.HEAD = this.branches[branchName];
    }
  
    /**
     * Gets the commit history starting from the current HEAD.
     *
     * @param {number} [limit=10] - The maximum number of commits to return.
     * @returns {Array<Object>} An array of commit objects, each containing id, message, timestamp, and branch.
     */
    log(limit = 10) {
      const history = [];
      let current = this.HEAD;
      let count = 0;
      
      while (current && count < limit) {
        const commit = this.commits[current];
        history.push({
          id: commit.id,
          message: commit.message,
          timestamp: commit.timestamp,
          branch: commit.branch
        });
        current = commit.parent;
        count++;
      }
      
      return history;
    }
  
    /**
     * Computes the difference between the data of two commits.
     *
     * @param {string} commitId1 - The first commit ID.
     * @param {string} commitId2 - The second commit ID.
     * @returns {Object} An object with `added`, `removed`, and `modified` properties.
     */
    diff(commitId1, commitId2) {
      const data1 = this.getCommit(commitId1);
      const data2 = this.getCommit(commitId2);
      
      return this._generateDiff(data1, data2);
    }
  
    /**
     * Reverts to a specific commit by creating a new commit with the data of the specified commit.
     *
     * @param {string} commitId - The ID of the commit to revert to.
     * @returns {string} The ID of the new revert commit.
     */
    revert(commitId) {
      const data = this.getCommit(commitId);
      return this.commit(data, `Revert to ${commitId.substring(0, 7)}`);
    }
  
    /**
     * Lists all branches.
     *
     * @returns {Array<Object>} An array of branch objects, each with name, current status, and HEAD commit ID.
     */
    listBranches() {
      return Object.keys(this.branches).map(name => ({
        name,
        current: name === this.currentBranch,
        head: this.branches[name]
      }));
    }
  
    /**
     * Creates an independent copy of the version control system.
     *
     * @param {string} [forkName=null] - If provided, a new branch with this name is created in the forked instance.
     * @returns {VersionControl} A new `VersionControl` instance with a complete copy of the history.
     */
    fork(forkName = null) {
      const forked = new VersionControl();
      
      forked.commits = this._deepClone(this.commits);
      forked.branches = this._deepClone(this.branches);
      forked.currentBranch = this.currentBranch;
      forked.HEAD = this.HEAD;
      
      if (forkName && this.HEAD) {
        const forkCommitId = forked.commit(
          forked.getData(),
          `Forked from ${this.currentBranch} as ${forkName}`
        );
        
        forked.branches[forkName] = forkCommitId;
        forked.currentBranch = forkName;
      }
      
      return forked;
    }
  
    /**
     * Merges changes from another `VersionControl` instance into this one.
     * This implementation uses a simple merge by creating a merge commit with the data from the other instance's HEAD.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance to merge from.
     * @param {string} [branchName='merged'] - A name to identify the source of the merge.
     * @returns {string} The ID of the merge commit.
     * @throws {Error} If the other `VersionControl` instance is invalid.
     */
    merge(otherVC, branchName = 'merged') {
      if (!otherVC || !otherVC.HEAD) {
        throw new Error('Cannot merge empty version control');
      }
  
      for (const commitId in otherVC.commits) {
        if (!this.commits[commitId]) {
          this.commits[commitId] = this._deepClone(otherVC.commits[commitId]);
        }
      }
  
      const otherData = otherVC.getData();
      
      const mergeCommitId = this.commit(
        otherData,
        `Merge from ${branchName}`
      );
      
      return mergeCommitId;
    }
  
    /**
     * Applies a specific commit from another `VersionControl` instance to the current branch.
     *
     * @param {VersionControl} otherVC - The source `VersionControl` instance.
     * @param {string} commitId - The ID of the commit to cherry-pick.
     * @returns {string} The ID of the new commit.
     * @throws {Error} If the commit is not found in the source.
     */
    cherryPick(otherVC, commitId) {
      const commit = otherVC.commits[commitId];
      if (!commit) {
        throw new Error(`Commit ${commitId} not found in source`);
      }
  
      return this.commit(
        commit.data,
        `Cherry-pick: ${commit.message} (${commitId.substring(0, 7)})`
      );
    }
  
    /**
     * Gets metadata about the fork, such as commit count and branch information.
     *
     * @returns {Object} An object containing fork metadata.
     */
    getForkInfo() {
      return {
        totalCommits: Object.keys(this.commits).length,
        branches: Object.keys(this.branches),
        currentBranch: this.currentBranch,
        HEAD: this.HEAD,
        latestCommit: this.HEAD ? this.commits[this.HEAD] : null
      };
    }
  
    /**
     * Finds the most recent common ancestor commit between this and another `VersionControl` instance.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance.
     * @returns {Object|null} An object with the common ancestor's commit ID, data, and timestamp, or null if no common ancestor is found.
     */
    findCommonAncestor(otherVC) {
      const myCommits = new Set(Object.keys(this.commits));
      const theirCommits = Object.keys(otherVC.commits);
      
      const commonCommits = theirCommits.filter(id => myCommits.has(id));
      
      if (commonCommits.length === 0) {
        return null;
      }
      
      let current = this.HEAD;
      while (current) {
        if (otherVC.commits[current]) {
          return {
            commitId: current,
            commit: this.commits[current],
            divergedAt: this.commits[current].timestamp
          };
        }
        current = this.commits[current].parent;
      }
      
      return null;
    }
  
    /**
     * Gets the commits that are in this instance but not in another, starting from the common ancestor.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance.
     * @returns {Array<Object>} An array of commits ahead of the other instance.
     */
    getAheadCommits(otherVC) {
      const ancestor = this.findCommonAncestor(otherVC);
      if (!ancestor) return this.log(Infinity); // Return all if no common ancestor
      
      const aheadCommits = [];
      let current = this.HEAD;
      
      while (current && current !== ancestor.commitId) {
        aheadCommits.push(this.commits[current]);
        current = this.commits[current].parent;
      }
      
      return aheadCommits;
    }
  
    /**
     * Gets the commits that are in another instance but not in this one.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance.
     * @returns {Array<Object>} An array of commits this instance is behind.
     */
    getBehindCommits(otherVC) {
      return otherVC.getAheadCommits(this);
    }
  
    /**
     * Compares this instance with another to check for divergence.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance.
     * @returns {Object} An object detailing the comparison, including common ancestor, ahead/behind counts, and whether a fast-forward is possible.
     */
    compareForks(otherVC) {
      const ancestor = this.findCommonAncestor(otherVC);
      const ahead = this.getAheadCommits(otherVC);
      const behind = this.getBehindCommits(otherVC);
      
      return {
        commonAncestor: ancestor,
        ahead: ahead.length,
        behind: behind.length,
        aheadCommits: ahead,
        behindCommits: behind,
        diverged: ahead.length > 0 && behind.length > 0,
        canFastForward: ahead.length === 0 && behind.length > 0
      };
    }
  
    /**
     * Rebases the current branch's commits on top of another `VersionControl` instance's HEAD.
     *
     * @param {VersionControl} targetVC - The target `VersionControl` instance to rebase onto.
     * @returns {Object} An object indicating the success of the rebase and the number of replayed commits.
     */
    rebase(targetVC) {
      const comparison = this.compareForks(targetVC);
      
      if (!comparison.diverged) {
        return { success: true, message: 'Already up to date' };
      }
      
      this.HEAD = targetVC.HEAD;
      this.currentBranch = targetVC.currentBranch;
      
      for (const commitId in targetVC.commits) {
        if (!this.commits[commitId]) {
          this.commits[commitId] = this._deepClone(targetVC.commits[commitId]);
        }
      }
      
      const aheadCommits = comparison.aheadCommits.reverse();
      const replayedCommits = [];
      
      for (const commit of aheadCommits) {
        const newId = this.commit(commit.data, `${commit.message} (rebased)`);
        replayedCommits.push(newId);
      }
      
      return {
        success: true,
        message: 'Rebase successful',
        replayedCommits: replayedCommits.length
      };
    }
  
    /**
     * Squashes a number of recent commits into a single new commit.
     *
     * @param {number} commitCount - The number of commits from HEAD to squash.
     * @param {string} [message='Squashed commits'] - The message for the new squashed commit.
     * @returns {string} The ID of the new squashed commit.
     * @throws {Error} If there are not enough commits to squash.
     */
    squash(commitCount, message = 'Squashed commits') {
      const history = this.log(commitCount + 1);
      
      if (history.length <= 1) {
        throw new Error('Not enough commits to squash');
      }
      
      const currentData = this.getData();
      
      const baseCommit = history[Math.min(commitCount, history.length - 1)];
      const newParent = baseCommit.parent;
      
      const squashedId = this._generateCommitId();
      const timestamp = new Date().toISOString();
      
      const commit = {
        id: squashedId,
        data: this._deepClone(currentData),
        message,
        timestamp,
        parent: newParent,
        branch: this.currentBranch,
        squashedCommits: history.slice(0, commitCount).map(c => c.id)
      };
      
      this.commits[squashedId] = commit;
      this.HEAD = squashedId;
      this.branches[this.currentBranch] = squashedId;
      
      return squashedId;
    }
  
    /**
     * Fetches and merges changes from another `VersionControl` instance.
     *
     * @param {VersionControl} otherVC - The remote `VersionControl` instance.
     * @param {('merge'|'rebase')} [strategy='merge'] - The strategy to use for combining changes ('merge' or 'rebase').
     * @returns {Object} An object with the result of the pull operation.
     * @throws {Error} If an unknown pull strategy is provided.
     */
    pull(otherVC, strategy = 'merge') {
      const comparison = this.compareForks(otherVC);
      
      if (!comparison.diverged && comparison.behind === 0) {
        return { success: true, message: 'Already up to date', changes: 0 };
      }
      
      if (comparison.canFastForward) {
        for (const commitId in otherVC.commits) {
          if (!this.commits[commitId]) {
            this.commits[commitId] = this._deepClone(otherVC.commits[commitId]);
          }
        }
        this.HEAD = otherVC.HEAD;
        this.branches[this.currentBranch] = otherVC.HEAD;
        
        return {
          success: true,
          message: 'Fast-forward',
          changes: comparison.behind
        };
      }
      
      if (strategy === 'merge') {
        const mergeId = this.merge(otherVC, 'pull');
        return {
          success: true,
          message: 'Merge successful',
          mergeCommit: mergeId,
          changes: comparison.behind
        };
      } else if (strategy === 'rebase') {
        return this.rebase(otherVC);
      } else {
        throw new Error('Unknown pull strategy');
      }
    }
  
    /**
     * Prepares a list of commits to be applied to another `VersionControl` instance.
     *
     * @param {VersionControl} otherVC - The remote `VersionControl` instance.
     * @returns {Object} An object containing the commits to push.
     */
    push(otherVC) {
      const comparison = this.compareForks(otherVC);
      
      if (comparison.ahead === 0) {
        return { success: true, message: 'Nothing to push', commits: [] };
      }
      
      return {
        success: true,
        message: `Ready to push ${comparison.ahead} commits`,
        commits: comparison.aheadCommits,
        canFastForward: comparison.behind === 0
      };
    }
  
    /**
     * Performs a bidirectional synchronization with another `VersionControl` instance.
     *
     * @param {VersionControl} otherVC - The other `VersionControl` instance to sync with.
     * @param {('ours'|'theirs')} [conflictResolution='ours'] - The strategy for resolving conflicts if both have changes.
     * @returns {Object} The result of the synchronization.
     * @throws {Error} If automatic conflict resolution is not possible.
     */
    sync(otherVC, conflictResolution = 'ours') {
      const comparison = this.compareForks(otherVC);
      
      if (!comparison.diverged) {
        return { success: true, message: 'Already in sync' };
      }
      
      if (comparison.ahead === 0) {
        return this.pull(otherVC);
      }
      
      if (comparison.behind === 0) {
        const pushResult = this.push(otherVC);
        for (const commit of pushResult.commits.reverse()) {
          if (!otherVC.commits[commit.id]) {
            otherVC.commits[commit.id] = this._deepClone(commit);
          }
        }
        otherVC.HEAD = this.HEAD;
        otherVC.branches[otherVC.currentBranch] = this.HEAD;
        
        return { success: true, message: `Pushed ${comparison.ahead} commits` };
      }
      
      if (conflictResolution === 'ours') {
        this.merge(otherVC, 'sync');
        return { success: true, message: 'Synced (kept our changes)', conflicts: true };
      } else if (conflictResolution === 'theirs') {
        return this.pull(otherVC);
      } else {
        throw new Error('Cannot auto-resolve conflicts');
      }
    }
  
    /**
     * Creates an exact copy of the `VersionControl` instance.
     *
     * @returns {VersionControl} A new `VersionControl` instance with identical state.
     */
    clone() {
      const cloned = new VersionControl();
      cloned.commits = this._deepClone(this.commits);
      cloned.branches = this._deepClone(this.branches);
      cloned.currentBranch = this.currentBranch;
      cloned.HEAD = this.HEAD;
      return cloned;
    }
  
    /**
     * Checks if the current data has uncommitted changes compared to the HEAD commit.
     *
     * @param {*} currentData - The current data to compare against HEAD.
     * @returns {boolean} `true` if there are changes, `false` otherwise.
     */
    isDirty(currentData) {
      if (!this.HEAD) return currentData !== null;
      const headData = this.getData();
      return JSON.stringify(headData) !== JSON.stringify(currentData);
    }
  
    /**
     * Saves the current changes without committing them.
     *
     * @param {*} data - The data to stash.
     * @param {string} [stashMessage='WIP'] - A message for the stash.
     * @returns {number} The index of the new stash entry.
     */
    stash(data, stashMessage = 'WIP') {
      if (!this.stashStack) this.stashStack = [];
      
      this.stashStack.push({
        data: this._deepClone(data),
        message: stashMessage,
        timestamp: new Date().toISOString(),
        branch: this.currentBranch,
        head: this.HEAD
      });
      
      return this.stashStack.length - 1;
    }
  
    /**
     * Applies and removes the most recent stash.
     *
     * @returns {*} The data from the popped stash.
     * @throws {Error} If there is no stash to pop.
     */
    stashPop() {
      if (!this.stashStack || this.stashStack.length === 0) {
        throw new Error('No stash to pop');
      }
      
      const stash = this.stashStack.pop();
      return stash.data;
    }
  
    /**
     * Applies a stash without removing it from the stash list.
     *
     * @param {number} [index=-1] - The index of the stash to apply. Defaults to the most recent stash.
     * @returns {*} The data from the applied stash.
     * @throws {Error} If there is no stash available.
     */
    stashApply(index = -1) {
      if (!this.stashStack || this.stashStack.length === 0) {
        throw new Error('No stash available');
      }
      
      const stash = index === -1 
        ? this.stashStack[this.stashStack.length - 1]
        : this.stashStack[index];
      
      if (!stash) {
        throw new Error(`Stash at index ${index} not found.`);
      }

      return this._deepClone(stash.data);
    }
  
    /**
     * Lists all stashes.
     *
     * @returns {Array<Object>} An array of stash objects.
     */
    stashList() {
      if (!this.stashStack) return [];
      return this.stashStack.map((s, i) => ({
        index: i,
        message: s.message,
        timestamp: s.timestamp,
        branch: s.branch
      }));
    }
  
    /**
     * Exports the entire version history to a JSON string.
     *
     * @returns {string} The JSON string representation of the version control state.
     */
    export() {
      return JSON.stringify({
        commits: this.commits,
        branches: this.branches,
        currentBranch: this.currentBranch,
        HEAD: this.HEAD,
        stashStack: this.stashStack || []
      });
    }
  
    /**
     * Imports version history from a JSON string.
     *
     * @param {string} jsonString - The JSON string to import from.
     */
    import(jsonString) {
      const data = JSON.parse(jsonString);
      this.commits = data.commits;
      this.branches = data.branches;
      this.currentBranch = data.currentBranch;
      this.HEAD = data.HEAD;
      this.stashStack = data.stashStack || [];
    }
  
    /**
     * Generates a unique commit ID.
     * @private
     * @returns {string} A random string to be used as a commit ID.
     */
    _generateCommitId() {
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    }
  
    /**
     * Creates a deep clone of an object.
     * @private
     * @param {*} obj - The object to clone.
     * @returns {*} A deep clone of the object.
     */
    _deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  
    /**
     * Generates a diff object between two objects.
     * @private
     * @param {*} obj1 - The first object.
     * @param {*} obj2 - The second object.
     * @param {string} [path=''] - The current path for nested objects.
     * @returns {Object} An object with `added`, `removed`, and `modified` arrays.
     */
    _generateDiff(obj1, obj2, path = '') {
      const diff = { added: [], removed: [], modified: [] };
      
      if (typeof obj1 === 'string' && typeof obj2 === 'string') {
        if (obj1 !== obj2) {
          diff.modified.push({ path, old: obj1, new: obj2 });
        }
        return diff;
      }
  
      const keys1 = new Set(Object.keys(obj1 || {}));
      const keys2 = new Set(Object.keys(obj2 || {}));
      
      for (const key of keys1) {
        if (!keys2.has(key)) {
          diff.removed.push({ path: path ? `${path}.${key}` : key, value: obj1[key] });
        }
      }
      
      for (const key of keys2) {
        const newPath = path ? `${path}.${key}` : key;
        if (!keys1.has(key)) {
          diff.added.push({ path: newPath, value: obj2[key] });
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          if (typeof obj1[key] === 'object' && obj1[key] !== null && typeof obj2[key] === 'object' && obj2[key] !== null) {
            const nested = this._generateDiff(obj1[key], obj2[key], newPath);
            diff.added.push(...nested.added);
            diff.removed.push(...nested.removed);
            diff.modified.push(...nested.modified);
          } else {
            diff.modified.push({ path: newPath, old: obj1[key], new: obj2[key] });
          }
        }
      }
      
      return diff;
    }
  }
  
  // Universal module definition
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionControl;
  }
  
  if (typeof window !== 'undefined') {
    window.VersionControl = VersionControl;
  }
