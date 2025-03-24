import { useQuery } from "@tanstack/react-query";
import { useClient as useUrqlClient } from "urql";

import { graphql } from "@/graphql/graphql";

export function useTopNCurators() {
  const curatorsQuery = graphql(`
    query ExampleQuery {
      curators {
        items {
          addresses {
            address
            chainId
          }
        }
      }
    }
  `);

  const urqlClient = useUrqlClient();

  const { data } = useQuery({
    queryKey: ["testing"],
    queryFn: async () => {
      const { data } = await urqlClient.query(curatorsQuery, {});
      return data?.curators;
    },
  });

  console.log("curators", data);
}
