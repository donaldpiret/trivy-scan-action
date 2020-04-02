import { context } from '@actions/github/lib/github';
import * as core from '@actions/core';
const github = require('@actions/github');

export async function getPackages(
  token: string
) {
  const client = new github.GitHub(token);
  const query = `
      {
        repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
          packages(first: 100) {
            nodes {
              name
              packageType
              versions(first: 100) {
                nodes {
                  package {
                    name
                  }
                  version
                }
              }
            }
          }
        }
      }
    `
  const result = await client.graphql(query, {
      headers: {
        accept: 'application/vnd.github.packages-preview+json'
      }
    }
  );
  let formattedPackages: string[] = result.repository.packages.nodes.
      filter(node => node.packageType == 'DOCKER').
      map((node) => {
    return node.versions.nodes.map((version) => {
      return `docker.pkg.github.com/${context.repo.owner}/${context.repo.repo}/${version.package.name}:${version.version}`
    })
  }).flat().filter(elem => elem !== undefined && elem.indexOf(':docker-base-layer') < 0);

  return formattedPackages;

}
