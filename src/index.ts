import * as core from '@actions/core';
import * as github from '@actions/github';
import { Trivy, Downloader } from './trivy';
import { createIssue } from './issue';
import { getPackages } from './packages';
import {
  TrivyOption,
  IssueOption,
  IssueResponse,
  Vulnerability,
} from './interface';

async function run() {
  try {
    const trivyVersion: string = core
      .getInput('trivy_version')
      .replace(/^v/, '');
    let images: string[] =
      (core.getInput('images') || process.env.IMAGE_NAMES as String).split(',');
    const issueFlag: boolean = core.getInput('issue').toLowerCase() == 'true';
    const token: string = core.getInput('token', { required: true });

    if (images.length == 0) {
      // Fetch all images from Github packages
      //github.context
      images = await getPackages(token);
    }

    const trivyOption: TrivyOption = {
      severity: core.getInput('severity').replace(/\s+/g, ''),
      vulnType: core.getInput('vuln_type').replace(/\s+/g, ''),
      ignoreUnfixed: core.getInput('ignore_unfixed').toLowerCase() === 'true',
      format: issueFlag ? 'json' : 'table',
    };

    const downloader = new Downloader();
    const trivyCmdPath: string = await downloader.download(trivyVersion);

    const trivy = new Trivy();

    // Do the vulnerability scanning for each images
    for (const image of images) {
      const result: Vulnerability[] | string = trivy.scan(
        trivyCmdPath,
        image,
        trivyOption
      );

      if (!issueFlag) {
        core.info(
          `Not create a issue for ${image} because issue parameter is false.
        Vulnerabilities:
        ${result}`
        );
        continue;
      }

      const issueContent: string = trivy.parse(result as Vulnerability[]);

      if (issueContent === '') {
        core.info(
          `Vulnerabilities were not found for ${image}.\nYour maintenance looks good 👍`
        );
        continue;
      }

      const issueOption: IssueOption = {
        title: core.getInput('issue_title'),
        body: issueContent,
        labels: core
          .getInput('issue_label')
          .replace(/\s+/g, '')
          .split(','),
        assignees: core
          .getInput('issue_assignee')
          .replace(/\s+/g, '')
          .split(','),
      };

      const output: IssueResponse = await createIssue(token, issueOption);
    }


    //core.setOutput('html_url', output.htmlUrl);
    //core.setOutput('issue_number', output.issueNumber.toString());
  } catch (error) {
    core.error(error.stack);
    core.setFailed(error.message);
  }
}

run();
