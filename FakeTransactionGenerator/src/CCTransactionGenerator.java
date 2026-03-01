import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CCTransactionGenerator {

    public static void main(String[] args) {

        int maxTransactions = 1000;
        int cardPoolSize = 250;
        int transactionId = 1;
        int totalWritten = 0;

        String[] merchants = {
                "Walmart", "Amazon", "Target", "BestBuy", "Costco",
                "Kroger", "HomeDepot", "Walgreens", "CVS",
                "McDonalds", "Starbucks", "Shell", "Exxon",
                "AppleStore", "Nike", "eBay", "Uber", "Lyft",
                "Lowes", "Macy's"
        };

        String[] states = {
                "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
                "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
                "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
                "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
                "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
        };

        Random rand = new Random();

        List<Long> cardPool = new ArrayList<>();
        Map<Long, String> homeState = new HashMap<>();

        for (int i = 0; i < cardPoolSize; i++) {
            long card = 4000000000000000L +
                    (long)(rand.nextDouble() * 1000000000000000L);
            cardPool.add(card);
            homeState.put(card, states[rand.nextInt(states.length)]);
        }

        try {
            FileWriter writer = new FileWriter("transactions2.csv");

            writer.append("transaction_id,card_number,timestamp,merchant,location,amount,is_potential_fraud\n");

            while (totalWritten < maxTransactions) {

                long card = cardPool.get(rand.nextInt(cardPoolSize));
                String cardHome = homeState.get(card);

                LocalDateTime baseTime = LocalDateTime.now()
                        .minusMinutes(rand.nextInt(60 * 24 * 30));

                String merchant = merchants[rand.nextInt(merchants.length)];
                String location = cardHome;

                double patternRoll = rand.nextDouble();

                // ================= TEST CHARGE PATTERN =================
                if (patternRoll < 0.02 && totalWritten <= maxTransactions - 4) {

                    int smallCount = 2 + rand.nextInt(2); // 2 or 3 small charges

                    for (int i = 0; i < smallCount && totalWritten < maxTransactions; i++) {
                        double smallAmount = 1 + rand.nextDouble() * 4;
                        smallAmount = Math.round(smallAmount * 100.0) / 100.0;

                        writer.append(transactionId++ + ","
                                + card + ","
                                + baseTime.plusSeconds(i * 30).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                                + merchant + ","
                                + location + ","
                                + String.format("%.2f", smallAmount) + ",0\n");

                        totalWritten++;
                    }

                    if (totalWritten < maxTransactions) {
                        double hugeAmount = 1500 + rand.nextDouble() * 2000;
                        hugeAmount = Math.round(hugeAmount * 100.0) / 100.0;

                        writer.append(transactionId++ + ","
                                + card + ","
                                + baseTime.plusSeconds(smallCount * 30).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                                + merchant + ","
                                + location + ","
                                + String.format("%.2f", hugeAmount) + ",1\n");

                        totalWritten++;
                    }

                    continue;
                }

                // ================= LOCATION JUMP FRAUD =================
                if (patternRoll >= 0.02 && patternRoll < 0.05 && totalWritten <= maxTransactions - 2) {

                    double amount = 50 + rand.nextDouble() * 500;
                    amount = Math.round(amount * 100.0) / 100.0;

                    writer.append(transactionId++ + ","
                            + card + ","
                            + baseTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                            + merchant + ","
                            + cardHome + ","
                            + String.format("%.2f", amount) + ",0\n");

                    totalWritten++;

                    String newState;
                    do {
                        newState = states[rand.nextInt(states.length)];
                    } while (newState.equals(cardHome));

                    writer.append(transactionId++ + ","
                            + card + ","
                            + baseTime.plusSeconds(30).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                            + merchant + ","
                            + newState + ","
                            + String.format("%.2f", amount) + ",1\n");

                    totalWritten++;

                    continue;
                }

                // ================= FRAUD BURST =================
                if (patternRoll >= 0.05 && patternRoll < 0.065 && totalWritten <= maxTransactions - 5) {

                    for (int i = 0; i < 5 && totalWritten < maxTransactions; i++) {
                        double burstAmount = 50 + rand.nextDouble() * 300;
                        burstAmount = Math.round(burstAmount * 100.0) / 100.0;

                        writer.append(transactionId++ + ","
                                + card + ","
                                + baseTime.plusSeconds(i * 20).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                                + merchant + ","
                                + location + ","
                                + String.format("%.2f", burstAmount) + ",1\n");

                        totalWritten++;
                    }

                    continue;
                }
             // ================= RANDOM HIGH-FRAUD TRANSACTION =================
                if (rand.nextDouble() < 0.01 && totalWritten < maxTransactions) { // 1% chance
                    double hugeAmount = 1500 + rand.nextDouble() * 2000; // $1500-$3500
                    hugeAmount = Math.round(hugeAmount * 100.0) / 100.0;

                    writer.append(transactionId++ + "," 
                        + card + "," 
                        + baseTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + "," 
                        + merchant + "," 
                        + location + "," 
                        + String.format("%.2f", hugeAmount) + ",1\n");

                    totalWritten++;
                    continue; // skip normal transaction for this iteration
                }

                // ================= NORMAL TRANSACTION =================
                double amount = 5 + rand.nextDouble() * 1000;
                amount = Math.round(amount * 100.0) / 100.0;

                writer.append(transactionId++ + ","
                        + card + ","
                        + baseTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                        + merchant + ","
                        + location + ","
                        + String.format("%.2f", amount) + ",0\n");

                totalWritten++;
            }

            writer.close();
            System.out.println("transactions2.csv generated with exactly " + totalWritten + " transactions.");

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}